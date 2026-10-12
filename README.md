# Use My Makeup

**Fresh looks. Using what you already own.**

A working, mobile-first guest MVP built with React, TypeScript and Vite. Users
add products, choose an occasion and available time, create a look, follow its
steps and save or rate the result. No account, API key or database is required.

## Run

### Run in your browser with GitHub Codespaces

On GitHub, select **Code → Codespaces → Create codespace on main**. The included
dev container installs Node.js and the locked dependencies, starts the app, and
forwards port **5173**. Open that port's browser link from the **Ports** tab if
it does not open automatically. Keep the port private.

If startup fails, inspect `/tmp/use-my-makeup-dev.log`. To start it manually,
run `npm run dev -- --host 0.0.0.0 --port 5173 --strictPort` in the Codespaces
terminal. Codespaces availability and usage charges depend on your GitHub plan.
This runs the app in your development workspace; it does not publish a public site.

### Run locally

Use Node.js **24.19.0** (see `.nvmrc` and `.node-version`) and npm 11+.

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Cloud checkout: `/workspace/UseMyMakeup`. Use the existing checkout; cloud tasks
are already isolated, so no extra Git worktree is needed. Restart the server in
each new task; processes are not part of an environment snapshot.

## Validate

```sh
npm run lint
npm test
npm run build
```

- `npm test`: 11 Node tests, including the ten-template/time/skill matrix,
  exclusions, missing products, changed categories and reference validation.
- `npm run build`: TypeScript checks and production assets in `dist/`.
- GitHub CI runs install, lint, unit tests and build on `main` pushes and PRs.

A real browser suite checks the complete journey at 1440px and 390px in light
and dark modes, plus photo handling, corrupt data, storage failures, keyboard focus, system appearance,
reduced motion and narrower/tablet layouts. With the
server running, use the prepared cloud environment's Python Playwright and
system Chromium:

```sh
python3 tests/browser_smoke.py
```

These browser dependencies are provided by the cloud machine, not installed by
`npm ci`. Elsewhere, install Python Playwright and set up Chromium separately.

Production preview and browser verification:

```sh
npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
# In another terminal:
APP_URL=http://127.0.0.1:4173/ python3 tests/browser_smoke.py
```

The browser suite uses fresh, isolated browser contexts and does not delete the
collection in your regular browser profile. Optional `SMOKE_SCOPE=edges` runs
only the edge-case checks; `SMOKE_SCOPE=accessibility` checks keyboard/theme/layout behavior.
With the production preview running, `python3 tests/pwa_smoke.py` checks service-worker
caching, offline reload and offline look generation.

## What works

- Welcome journey and clearly labelled demonstration makeup bag.
- Manual products with optional brand, name, shade, finish and photo. Add, edit,
  filter, search, delete and toggle availability. One makeup product is enough.
- JPEG/PNG/WebP previews, 5 MB limit, image-decoding errors, explicit photo-storage
  consent and individual photo removal. Saved photos are resized to 800px.
- Everyday, work, dinner, celebration and custom occasions; 5/10/20-minute budgets;
  four styles; two skill levels; per-product exclusions; no-base and eye-focus
  preferences.
- Ten curated look templates, structured inventory validation, step timings,
  beginner help, honest limitations and a simpler variation. No unowned product
  is silently introduced; tools alone do not create a look.
- One-step follow-along with help, back, skip and refresh recovery; full-list view.
- Saved/renamed looks, tried status, ease/usefulness ratings, private notes and
  local feedback. Missing, unavailable or category-changed products are flagged,
  and affected steps cannot be followed without restoring or skipping them.
- Light/dark/system modes, mobile navigation, keyboard-friendly native dialogs,
  reduced motion, storage guidance, skippable walkthrough and confirmed deletion.
- Opt-in, device-local journey events and JSON export. Exported event data does
  not contain product details, images, notes or feedback text. Opting out clears
  event history. Pricing interest is research only; no payment or subscription.
- PWA manifest, app icons and production-only service-worker app-shell caching.
  After the shell is cached, inventory, looks and creation work offline. Install
  availability depends on browser support and a secure HTTPS deployment.

## What is demonstrative or not connected

Sample bag products are **demonstration content**, never verified ownership.
Product illustrations are original decorative CSS drawings, not recognised
photos or exact representations of a shade.

The core generator is deterministic. AI personalisation and photo recognition
are **not connected**, so there are no fabricated recognition results, AI calls
or client-side API keys. Account syncing, an owner dashboard and aggregate
analytics are not connected. Feedback is saved locally and is not sent anywhere.
No shopping, virtual try-on, face scoring, payments or subscription is included.

If AI or vision is added later, use a secure server endpoint, validate its output
against confirmed/selected inventory and product-intended areas on the server,
add usage caps, explain third-party image processing and retain the template
fallback. The current `validateLook` is a client-side generator guard, not a
substitute for future server validation.

## Storage and privacy

All app data lives under `use-my-makeup:v1` in this browser's localStorage.
There is no remote backup or multi-device syncing. Clearing browser storage or
using private browsing can remove data. This is not encrypted storage; anyone
with access to the browser profile may see the collection and notes.

Photos are never sent to a server. Unchecked photo previews are discarded when
the product form closes; explicitly saved photos remain on this device. Static
service-worker caches contain app assets only, not collection data or images.
Storage failures show an in-memory-only warning. Invalid saved data is preserved
until the user explicitly deletes it. Settings offers a private raw-data backup;
this export contains sensitive photos/notes if present, and there is currently
no in-app backup import. Confirmed deletion removes all stored app data.

## Before a wider launch

1. Have a qualified makeup artist review all ten templates and step instructions.
   The app explicitly identifies the tutorial content as unreviewed beta content.
2. Deploy `dist/` to a static HTTPS host at the domain root. Hash-based navigation
   does not require server-side SPA route rewriting.
3. Review production privacy/help wording and verify PWA installation on target
   browsers. Automated checks verify caching/offline behavior, not every native
   installation prompt.
4. Add secure backend services and credentials only if AI, recognition, syncing
   or consent-based aggregate research are desired. None are needed for this MVP.

See [TESTER_GUIDE.md](TESTER_GUIDE.md) for the short walkthrough and limitations.
