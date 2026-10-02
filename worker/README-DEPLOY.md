# Deploying the backend (one-time setup, ~10 minutes)

This folder is a tiny Cloudflare Worker — it's the only thing that holds your real Anthropic
API key. The website itself (`index.html`) never sees it; it only knows a shared "team access
code" that it sends to this Worker, which checks the code and then makes the real API call.

You need to run a few commands yourself in Terminal, because they involve your own Cloudflare
account and your own Anthropic key — those aren't things anyone else should type in for you.
Everything else (writing this code, wiring the website up to it) is already done.

## 0. What you'll need

- A free Cloudflare account (sign up at https://dash.cloudflare.com/sign-up if you don't have one)
- Your Anthropic API key, from https://console.anthropic.com/settings/keys
- Node.js installed (check with `node -v` in Terminal — if that fails, install from nodejs.org)
- A password/phrase you make up for your team to use (the "team access code")

## 1. Open Terminal and go to this folder

```
cd ~/Documents/PCR-Analysis-Tool/worker
```

(If the `worker` folder isn't there yet, copy it from wherever you received it into your
`PCR-Analysis-Tool` repository folder first.)

## 2. Log in to Cloudflare

```
npx wrangler login
```

This opens your browser and asks you to approve access. Approve it, then come back to Terminal.

## 3. Set your two secrets

Run each command, and when it prompts you, paste the value and press Enter. Nothing you type
here is echoed back or stored anywhere except Cloudflare's encrypted secret store.

```
npx wrangler secret put ANTHROPIC_API_KEY
```
(paste your real Anthropic key when prompted)

```
npx wrangler secret put TEAM_CODE
```
(type whatever password you want your team to use — share this with them separately, e.g. in
a chat message or password manager, not by committing it anywhere)

## 4. Deploy

```
npx wrangler deploy
```

This prints a URL at the end, something like:

```
https://pcr-tool-proxy.<your-subdomain>.workers.dev
```

Copy that exact URL.

## 5. Point the website at your Worker

Open `index.html` (in the repository root, not this `worker` folder), find this line near the
`callClaude` function:

```js
const WORKER_URL = "https://pcr-tool-proxy.YOUR-SUBDOMAIN.workers.dev";
```

Replace it with the real URL from step 4, then commit and push `index.html` as usual.

## 6. Tell your team

Give each team member the TEAM_CODE you chose in step 3. They paste it into the website's
Settings dialog, under "Team access code" — that's the only setup they need, no Anthropic
account or key of their own required.

## Rotating the code or the key later

- To change the team code: `npx wrangler secret put TEAM_CODE` again with a new value, then
  tell your team the new one.
- To rotate the Anthropic key (e.g. if you think it leaked): generate a new key in the
  Anthropic console, run `npx wrangler secret put ANTHROPIC_API_KEY` again with the new value,
  then revoke the old key in the Anthropic console.

## Optional: per-team rate limiting

By default there's no cap on how many requests the team can make — fine for a small trusted
group. If you want a safety net (e.g. in case the team code ever leaks), see the commented-out
block in `wrangler.toml` for a simple per-minute cap using a free Cloudflare KV namespace.
