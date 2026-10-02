/**
 * PCR Analysis Tool — backend proxy.
 *
 * Why this exists: the tool's frontend (index.html, served as a static page from GitHub
 * Pages) has no server of its own, so it cannot hold a real Anthropic API key — anything
 * baked into the page or synced to the repo is public. This Worker is the one place that
 * holds the real key (as a Cloudflare secret, never in source), and the frontend talks to
 * this Worker instead of talking to api.anthropic.com directly.
 *
 * Access control: every request must carry the team's shared access code in the
 * `x-team-code` header, checked against the TEAM_CODE secret below. This is NOT the same
 * kind of secret as the Anthropic key — it's just a gate so random visitors to the public
 * GitHub Pages site can't spend your Anthropic credits. Treat it like a shared Wi-Fi
 * password: easy to rotate, not something to protect like a real credential.
 *
 * Required secrets (set with `wrangler secret put <NAME>` — see README-DEPLOY.md):
 *   ANTHROPIC_API_KEY   your real Anthropic API key (console.anthropic.com)
 *   TEAM_CODE           a password you make up and share with your team
 *
 * Optional: bind a KV namespace as RATE_LIMIT_KV to cap requests per minute per team code
 * (see wrangler.toml). Without it, the Worker still works — it just skips that check.
 */

const RATE_LIMIT_PER_MINUTE = 20;

export default {
  async fetch(request, env) {
    // Restrict to the GitHub Pages origin the tool is actually served from. Change this if
    // you fork the repo or host the frontend somewhere else.
    const ALLOWED_ORIGIN = "https://gauravraher.github.io";

    const corsHeaders = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-team-code",
      "Vary": "Origin"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: { message: "Method not allowed" } }, 405, corsHeaders);
    }

    if (!env.TEAM_CODE) {
      // Misconfigured deployment — fail loudly rather than silently accepting everyone.
      return json({ error: { message: "Backend is not configured (missing TEAM_CODE)." } }, 500, corsHeaders);
    }

    const suppliedCode = request.headers.get("x-team-code") || "";
    if (!timingSafeEqual(suppliedCode, env.TEAM_CODE)) {
      return json({ error: { message: "Unauthorized — check the team access code in Settings." } }, 401, corsHeaders);
    }

    if (env.RATE_LIMIT_KV) {
      const bucket = `rl:${await sha256(suppliedCode)}:${Math.floor(Date.now() / 60000)}`;
      const current = parseInt((await env.RATE_LIMIT_KV.get(bucket)) || "0", 10);
      if (current >= RATE_LIMIT_PER_MINUTE) {
        return json({ error: { message: "Rate limit exceeded for the team — wait a moment and try again." } }, 429, corsHeaders);
      }
      await env.RATE_LIMIT_KV.put(bucket, String(current + 1), { expirationTtl: 90 });
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: { message: "Backend is not configured (missing ANTHROPIC_API_KEY)." } }, 500, corsHeaders);
    }

    let body;
    try {
      body = await request.text();
      JSON.parse(body); // reject non-JSON bodies early
    } catch (e) {
      return json({ error: { message: "Request body must be JSON." } }, 400, corsHeaders);
    }

    let anthropicResp;
    try {
      anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body
      });
    } catch (e) {
      return json({ error: { message: "Could not reach Anthropic's API: " + e.message } }, 502, corsHeaders);
    }

    const respBody = await anthropicResp.text();
    return new Response(respBody, {
      status: anthropicResp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};

function json(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...extraHeaders, "Content-Type": "application/json" }
  });
}

// Constant-time string comparison so the team code can't be guessed via response-time
// differences. Both inputs are hashed first so lengths never leak either.
async function timingSafeEqual(a, b) {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  if (ha.length !== hb.length) return false;
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  return diff === 0;
}

async function sha256(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
