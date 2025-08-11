
# Dive Center SOPs — Drop-in Bundle

This folder adds a public, Markdown-based SOP section with in-browser editing that commits directly to your repo via the GitHub API.

## Files

- `sops/sop.css` — styling
- `sops/sop.js` — editor + GitHub API (configured for 3creddy/dive-center-utilities on branch `main`)
- `sops/index.html` — SOP hub page
- `sops/open-water-course.html` — OWD SOP page
- `sops/divemaster-training-course.html` — DMT SOP page
- `content/open-water-course.md` — initial Markdown (blank)
- `content/divemaster-training-course.md` — initial Markdown (blank)

## How to add the third button on your landing page

On your main `index.html`, add a card/tile/button that links to the SOP hub:

```html
<a class="card" href="sops/index.html">
  <h2>Dive Center SOPs</h2>
  <p>Open Water & Divemaster (editable)</p>
</a>
```

Match classes to your existing button style if needed.

## Token setup (once per browser)

1. Create a **fine-grained PAT** in GitHub → Settings → Developer settings → Personal access tokens → Fine-grained.
   - Repository access: **Only** `3creddy/dive-center-utilities`
   - Permissions → **Contents: Read and Write**
2. Open an SOP page (e.g., `/sops/open-water-course.html`), paste the token, click **Set Token**.
3. Click **Edit**, type in Markdown, then **Save** with a commit message.

Token is stored in your browser `localStorage` as `gh_pat` and is never committed to the repo.
