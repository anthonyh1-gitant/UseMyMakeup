# Use My Makeup

**Fresh looks. Using what you already own.** A visual-first, mobile-friendly guest
MVP: **occasion → see a model reference → tap products you own → follow the look**.

## Run in GitHub Codespaces

On GitHub select **Code → Codespaces → Create codespace on main**. The dev container
installs Node/dependencies, starts Vite and forwards port **5173**. Open that port
from the **Ports** tab; keep it private. Codespaces usage depends on your GitHub plan.

For an existing Codespace, pull the update, stop any old dev server, then restart:

```sh
git pull
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Automatic startup output is in `/tmp/use-my-makeup-dev.log`.

## Local/cloud development

Node.js **24.19.0** is pinned in `.nvmrc` and `.node-version`; use npm 11+.

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

Cloud checkout: `/workspace/UseMyMakeup`. Use the existing checkout; each task is
already isolated, so do not create another Git worktree unless requested. Restart
servers for a new task; processes are not retained by environment snapshots.

## What changed

- Model-reference gallery appears before any input. One occasion selection; no
  questionnaire, account, selfie or initial inventory form.
- Two visual moods per occasion, with optional 5/10/20-minute adjustment.
- Category buttons confirm ownership without names, brands, shades or photos.
  Existing real/available products are reused, and choices are remembered.
  Demonstration inventory never becomes ownership without explicit confirmation.
- Up to five recipe steps, validated against confirmed products. Smaller bags get
  simpler recipes and matching-category reference pictures where available.
- Saved looks and follow-along show the model reference, with conspicuous AI and
  illustrative-colour labels. No virtual try-on or promised appearance outcome.
- Manual inventory, optional photos, edits, filtering, unavailable items, missing
  product warnings, ratings, private notes and local feedback remain available.

## Images and generation

`public/looks/editorial-models.png` and `minimal-models.png` are AI-generated
portrait sheets produced for this app. Twelve adult model portraits represent
several skin tones and minimal/occasion looks. CSS displays individual tiles;
`src/visual.ts` maps the selected recipe categories to appropriate references.
These are reusable style references, not exact predictions or shade matches.

All seven nonempty combinations of blush, mascara and lips have a cached image;
the library also includes selected eyeshadow/liner combinations. Unsupported
combinations show a clear image-unavailable state and working instructions,
rather than silently displaying makeup the recipe does not include.

### Optional fresh image generation

No credential is required for the cached gallery or practical journey. To enable
fresh matching references in a **private Codespace**, create a Codespaces secret
named **MAKEUP_IMAGE_API_KEY** with your OpenAI API key and restart the Codespace
or server so it is injected. Alternatively, copy `.env.example` to `.env.local`
and set the key there. These files are ignored; never commit credentials or use
an environment name starting with `VITE_` for a key.

The image button is user-initiated and tells users what is sent. The server sends
only the curated occasion/style and makeup categories to OpenAI, never inventory
IDs, names, photos, shades, notes or feedback. It uses the Images API with
`gpt-image-1`, validates inputs, rejects arbitrary prompts, checks the request
origin, and caches PNGs under ignored `.cache/look-images/`. No key reaches the
client bundle. Failed API calls leave the local recipe and cached imagery intact.

`MAKEUP_IMAGE_HOURLY_LIMIT` defaults to **8**, capped at **20** per server process
per hour, with at most two simultaneous unique requests. Failed paid attempts
count too; identical requests reuse cache. This is a private beta control, not
production authentication: restarting/multiple server processes resets or splits
these limits. Add authentication and a durable shared usage budget before exposing
live generation publicly. Verify your OpenAI account's image-model access and
billing. The real provider connection has not been tested without a key; server
validation/caching/limits/failures are tested with an injected local fixture provider.

The API is mounted by a Vite plugin in dev and `npm run preview`. A static `dist/`
deployment includes the cached gallery but **not** the Node image endpoint. A
production Node/serverless adapter is needed for live generation on a public host.

## Validate

```sh
npm run lint
npm test
npm run build
```

23 Node tests cover the original generator, visual recipe/category matching,
quick confirmation, server input validation, caching, quota and provider failure.
The build includes TypeScript checks. GitHub CI runs these commands.

The prepared cloud machine has Python Playwright and system Chromium. With the
server running, execute:

```sh
python3 tests/browser_smoke.py
```

This suite uses fresh browser contexts: complete guest journeys at 1440px/390px
in light/dark, no text-entry requirement, image decoding, remembered choices,
follow-along recovery, edits/deletion, category changes, photos, storage failures,
image/provider fallback, retry and 320px/tablet keyboard/theme checks. It does not
alter the collection in a regular user's browser profile. Python Playwright and
Chromium are separate from npm dependencies and must be supplied outside this
prepared cloud machine.

Production:

```sh
npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
# In another terminal:
APP_URL=http://127.0.0.1:4173/ python3 tests/browser_smoke.py
python3 tests/pwa_smoke.py
```

Optional `SMOKE_SCOPE=edges` or `accessibility` selects those browser checks.

## Offline, privacy and limitations

The production PWA caches the app shell and model reference sheets, so both
images and recipe generation work offline after caching. Installation requires a
supported browser and secure hosting. Live image requests are online-only and
are deliberately excluded from service-worker caching.

Products, user photos, notes, saved recipes and progress live in browser
localStorage under `use-my-makeup:v1`. There is no account sync or encrypted
storage: another person using the browser profile may see them. Clearing browser
data may remove them. Invalid data is preserved for explicit deletion; full
storage produces an in-memory-only warning. Old saved recipes remain readable.

Optional JPEG/PNG/WebP photos have a 5 MB input limit, are resized to 800px and
saved only with explicit consent. Unchecked previews are discarded. Recognition
is not connected; photos are not uploaded. Product/image deletion and confirmed
whole-app deletion are available. Settings offers a private export that can
contain notes/photos; there is no in-app backup import yet.

Journey recording is opt-in and local only. Event exports exclude private data;
turning recording off deletes history. Feedback and pricing-interest answers are
stored locally, not sent. No payment is taken or subscription started.

Tutorial instructions are **unreviewed beta content** and need makeup-artist
review before inviting a wider audience. Model images are illustrative, not
exact shade matches or guaranteed results. Unsupported image combinations need
live generation or a larger reviewed reference library. No shopping, face scoring,
try-on, account syncing, aggregate analytics or owner dashboard is included.

See [TESTER_GUIDE.md](TESTER_GUIDE.md) for a short user walkthrough.
