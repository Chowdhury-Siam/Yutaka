# Yutaka Website — Room to grow

An original visual identity for Yutaka: deep green, near-black surfaces, and accents paired with its green folded-Y logo. An asymmetric hero, overlapping app screenshots, soft finance cards, and a simple daily rhythm give the site a character of its own. The website is separate from the installed Yutaka app and its self-hosted sync Worker.

## Website features

- Fresh HTML, CSS, and JavaScript; no frontend framework or extra runtime dependencies.
- Static app screenshots and finance illustrations. No interactive demo, iframe, or finance data entry.
- Feature cards lift and highlight on hover, with subtle illustration feedback and touch press feedback. Cards reflow for tablets and phones; FAQ rows support hover, keyboard focus, and animated expansion/collapse with reduced-motion support.
- The download pill morphs into a rounded drawer with a rolling title, chevron-to-close icon, and staggered platform entries. It opens in 400 ms and closes in 280 ms, with reduced-motion support and Escape/outside-click dismissal. Direct Android, Windows, Linux, and macOS installers, architecture options, and optional store links are included.
- Top and bottom Get Yutaka links scroll to and focus the download button without expanding the chooser. Only the main download button opens it.
- A header that contracts into a floating navigation bar on scroll, scroll-linked hero screens, and progressive reveal effects, with reduced-motion support. All content remains available without JavaScript.
- Mobile rendering keeps all animations: hero geometry is cached until resize, scroll updates stay inside the artwork, offscreen/hidden-tab hero work stops, and temporary compositor layers retain the screen shadows. Drawer and FAQ layout work is contained.
- Google Fonts supplies Manrope, with native sans-serif fonts as the offline fallback.
- Matching privacy and 404 pages.

- Responsive desktop/mobile layouts, dark green styling, accessible controls, and a link to the Yutaka source repository.
- Social share previews for the homepage use the **supplied green Yutaka logo**. The Open Graph and Twitter preview assets have a versioned URL to avoid serving older cached image files.
- Direct release downloads are built into the HTML. Opening the chooser checks the latest published app release; failed checks keep the last verified links usable. Google Play and Microsoft Store alternatives are configured **from GitHub Actions secrets** and hidden until a valid listing is supplied.
- Cloudflare Workers **Static Assets** hosting: **no website database, Turso integration, email collection, waitlist, rate-limit key, or separate API Worker**.

The Yutaka **installed app** can still optionally connect to its owner's separate Cloudflare sync Worker and private Turso database. The *public website* neither accesses nor needs that database.

## GitHub Actions deployment

This project must be at the **repository root** (including the hidden `.github` directory). The workflow is `.github/workflows/deploy-website.yml`. Pushes to `main` deploy the website when website files change. **Actions → Deploy Yutaka Website → Run workflow** also deploys it manually. Pull requests run tests and the bundle check only; forked repositories are not authorized to deploy through the bundled workflow.

In **GitHub repository → Settings → Secrets and variables → Actions**, configure:

| Type | Name | Required | Value |
| --- | --- | --- | --- |
| Secret | `CLOUDFLARE_WORKER_NAME` | Yes | Your Worker name, e.g. `siam-yutaka` (lowercase letters, digits and hyphens; maximum 63 characters) |
| Secret | `CLOUDFLARE_API_TOKEN` | Yes | A Cloudflare API token with Workers edit permission |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | Yes | Your Cloudflare account ID |
| Secret | `PLAY_STORE_URL` | No | Your published listing, e.g. `https://play.google.com/store/apps/details?id=YOUR.PACKAGE` |
| Secret | `MICROSOFT_STORE_URL` | No | Your published listing, e.g. `https://apps.microsoft.com/detail/YOUR-STORE-ID` |

`CLOUDFLARE_WORKER_NAME` is read **only from GitHub Actions secrets**. There is no manual Worker-name workflow input, repository-variable lookup, or fallback. Both push and manual deployments use the same saved secret; a missing or invalid Worker name fails early. Changing the secret deploys a different Worker and does not delete the old one.

The two store URLs are **only configured from GitHub Actions secrets**. The workflow validates the URLs and generates `public/assets/config.js` in its temporary checkout before deploying. **Do not edit or commit store URLs to `config.js`.** Each secret is optional; if one is missing, that optional store link remains hidden; direct installer downloads stay available. To publish a changed URL, update the GitHub secret and **rerun the deployment workflow** (changing a secret does not automatically start a run). Listing URLs are public links once deployed even though the configuration uses GitHub's encrypted-secret interface: never store API tokens or other confidential data in these URL secrets.

If you use a GitHub `production` environment, configure access to the repository or environment secrets there as appropriate; the workflow's deploy job specifies `environment: production`. Its test job does not require deployment secrets. The deployment summary shows the selected Worker name and, when available, the public URL.

### Custom domain

In Cloudflare, open **Workers & Pages → your Worker → Settings → Domains & Routes** and attach your custom domain. Configure the domain's DNS/HTTPS in Cloudflare. Changing the Worker name may require reassigning the domain.

### Previously deployed website with Turso

This version removes the entire website-specific Turso and release-notification implementation, including its migration scripts and signup API. If you previously deployed the old website, delete the **old website Worker's** unused `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `RATE_LIMIT_KEY` secrets in Cloudflare after updating. An old *website-only* Turso database can be retired after you export or dispose of any existing release-notification contacts according to your privacy commitments. **Do not delete the installed Yutaka app's private sync database or Worker credentials.**

## Local development

Node.js 22 is recommended (20 or later required):

```bash
npm ci
npm test
npm run check:bundle
npm run dev
```

Visit the local Workers URL printed by Wrangler (typically `http://localhost:8787`). Local previews include verified direct release downloads. Optional store links are hidden by default. To test URL generation without committing them, supply `PLAY_STORE_URL` and `MICROSOFT_STORE_URL` to `npm run configure:stores` in a disposable checkout; it overwrites the local `config.js`. GitHub Actions generates that file automatically during real deployment. For an ordinary local deployment, `npm run deploy` uses `wrangler.jsonc` and your authenticated Cloudflare account; the GitHub Actions Worker-name secret is applied by the GitHub workflow, not by a local deploy.

## Direct release downloads

`public/assets/releases.mjs` maps the latest stable release assets to installable files for all four platforms. The website requests the public GitHub API once when the chooser is opened; no token is exposed. File sizes and version labels update with the links. The checked-in HTML works without JavaScript or a successful API request. Unavailable files are disabled after a successful check rather than linking to an older release.

Deployment runs `node scripts/refresh-download-links.mjs` to refresh these static fallback links before publication. Release metadata is validated before any file is written. Android AAB files are store-upload bundles and are excluded from end-user downloads.

## Social link previews

The browser title and sharing titles are `Yutaka`. The homepage advertises `https://webpage.getyutaka.workers.dev/assets/yutaka-share-logo-v2.png`, a 512 × 512 PNG rendered from the supplied `public/assets/yutaka-logo.svg` on an opaque dark background. The fresh image URL replaces the older preview asset; transparent padding cannot turn white in preview clients. If the website moves to another domain, update both image URLs in `public/index.html`. Changes become live after deployment; existing messages and cached previews are controlled by the sharing platform.

## Project structure

`public/` contains the deployable site; `scripts/` configures deployment secrets; `tests/` verifies links, pages, configuration, and interactions. The repository remains compatible with the existing Cloudflare workflow.

## Key routes

| URL | Purpose |
| --- | --- |
| `/` | Public landing page and direct app downloads |
| `/privacy/` | Website privacy template; customize before public launch |

There is **no `/api/waitlist` or `/api/health` endpoint** and no website database. Native background scheduling, media upload, cross-device sync, PDF/XLSX/TXT exports, and notifications remain available only where implemented in the installed Yutaka app, not on this website.

## Pre-publication naming check

Before publishing, verify trademark clearance, domain availability, and store-listing availability for the **Yutaka** name in the regions where you plan to distribute the app.

