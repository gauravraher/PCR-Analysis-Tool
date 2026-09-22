# Clause → Compiler — standalone setup

One file, `index.html`. No build step, no server you have to run.

## What this is

Everything from the working prototype — three-panel review, verbatim-quote
verification, compiler component previews, validation rules, audit trail —
running as a plain web page instead of inside claude.ai. It does not need a
Claude account. It calls the Anthropic API directly from your browser using
your own API key, and (optionally) saves your work to a private GitHub
repository so it's there on any computer.

Two demo documents (GPI 5.0.1 and PCR 2019:14, real clauses, real page
numbers) are bundled in so the workspace is never empty. They're read-only
and never touch your repository — add your own documents with "Add
document".

## Step 1 — put the app online (5 min)

1. Create a **public** repository on GitHub, e.g. `pcr-tool`. (GitHub Pages
   on a free account requires the repo to be public — see the note at the
   bottom.)
2. Upload `index.html` to it, at the repository root.
3. Repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch:
   `main` / `(root)` → Save.
4. Wait about a minute. Your URL is `https://<username>.github.io/pcr-tool/`.

The page itself contains no data — it's safe for this repo to be public.

## Step 2 — get an Anthropic API key (2 min)

1. Go to [console.anthropic.com](https://console.anthropic.com), sign up or
   sign in, add a payment method.
2. Create an API key.
3. Analysing one PCR costs a few cents. You are billed directly by
   Anthropic — this is separate from any Claude subscription.

## Step 3 — persistent storage, optional (10 min)

Skip this if you're happy using Export/Import to carry work between
sessions — the app works fully without it. Do this if you want the same
work to appear automatically on any computer you open the URL from.

1. Create a **private** repository, e.g. `pcr-data`. Leave it empty.
2. GitHub → your profile photo → **Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**.
   - Repository access: **Only select repositories** → `pcr-data`.
   - Permissions → Repository permissions → **Contents: Read and write**.
   - Set an expiry (90 days is reasonable; you'll regenerate it after).
3. Copy the token now — GitHub only shows it once.

## Step 4 — connect the app

1. Open your Pages URL.
2. Click **Settings**.
3. Paste your Anthropic API key.
4. If you did Step 3: enter the GitHub username/org, the repository name
   (`pcr-data`), and the token.
5. Click **Test connection** (if you connected a repo), then **Save**.

You're set up. "Add document" now works, and if connected, everything you
do is saved to your private repository automatically — a small "Saved to
…" indicator sits in the toolbar strip.

## Using it on a second computer

Open the same Pages URL and repeat step 4 — paste the same Anthropic key
(or leave it, since it syncs from the repo once connected) and the same
GitHub token. Your documents and decisions load automatically.

Without a connected repository, use **Export** on the first computer and
**Import** on the second.

## Security notes, read once

- The Pages **site** is public, like any GitHub Pages site. It ships no
  data — only the app.
- Your Anthropic key and GitHub token live in this browser's local storage
  only. Anyone with access to this browser profile can read them. Don't use
  this on a shared or public computer without clearing it after
  (`Settings → Disconnect`, then clear the browser's site data for this
  page).
- If you connect a repository, your Anthropic key is also written into
  `data/config.json` **in plain text** in that private repo, so you don't
  have to re-enter it on other machines. Anyone with read access to that
  repository — or that token — can read it. Keep the repository private and
  the token scoped to only that one repo.
- Licensed standards (EN 15804, ISO documents, anything you don't hold
  redistribution rights to) should not go through the GitHub-connected path
  unless the data repo stays private and access-controlled the way you
  intend. Public documents (GPI, most PCRs) are fine.
- GitHub Pages on the **free** plan requires the *app* repo to be public.
  The *data* repo can be private on any plan — Pages and data are two
  separate repositories precisely so the data one can be private for free.

## What still doesn't work here

- OCR for scanned PDFs with no text layer (reported, not silently skipped).
- Automated cross-document conflict detection.
- Anything that needs your own Claude account or a claude.ai session —
  none of this app touches that.
