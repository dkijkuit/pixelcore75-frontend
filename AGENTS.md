# AGENTS.md

Vue 3 + Vuetify 3 + Pinia SPA (management GUI for Pixelcore75 panels). Talks to a separate Java backend.

## Commands

- `npm run dev` — Vite dev server
- `npm run build` — runs `type-check` and `build-only` in parallel; both must pass
- `npm run type-check` — `vue-tsc --build` over project-referenced tsconfigs (app + node)
- `npm run lint` — ESLint flat config; note it auto-fixes (`--fix`)
- `npm run format` — Prettier on `src/` only

No test suite exists. Node must be `^20.19.0 || >=22.12.0`.

## Backend URL is hardcoded

The API base `http://localhost:8080/v1` is not env-driven. It is hardcoded in:

- `src/service/api.ts` (both the `api` and `bare` axios clients)
- `src/components/panels/PanelDetails.vue` (raw `fetch` + `EventSource` for image upload/SSE)

Changing environments means editing these, or introduce an env var if asked.

## Auth model

- Bearer access token in headers + refresh cookie (`withCredentials: true`).
- Request interceptor in `src/service/api.ts` does a one-time `/auth/refresh` via the `bare` client (avoids interceptor recursion) when no token exists; `/auth/*` endpoints skip the interceptor.
- Router guard in `src/router/index.ts` refreshes only on `meta.requiresAuth` routes, redirecting to `/login` on failure.
- `src/service/http.ts` is fully commented-out legacy — do not use it.

## Structure

- `src/registry/screensRegistry.ts` — central screen-type registry. To add a screen type: add a `create*` factory + `*_DEF` entry, register it in `screenRegistry`, and add the form component under `src/components/screens/`. Types (`ScreenType`, `AnyScreen`) are derived from the registry — keep it that way.
- ANIMATION screens (frames as data URLs + `frameDelayMs`) must stay in sync with the backend record (`AnimationScreenConfig`): 2–60 frames for ANIMATION (server-validated), delay 10–65535 ms (u16); the protocol wire cap remains 200. `AnimationForm.vue` splits uploaded GIFs via the browser `ImageDecoder` API (feature-detected; not in Safari), auto-trims GIFs to the first 60 frames with a snackbar hint, and scales frames to 64×32 — same limits the backend enforces.
- CUSTOM screens: a rotation entry carries **exactly one** of `customScreenId` (reference into the user-owned custom screen library) or `design` (a `.pxd` v1 **or v2** JSON **string** — legacy inline entries from before the library existed; normative spec: `../pixelcore75-server/docs/custom-screens-design.md`). The library is managed in the Custom Screens nav view (`DashboardCustomScreens.vue` + `src/service/customScreens.ts`, REST CRUD under `/v1/screen/custom`, shareable across users); the per-panel Add/Edit dialog uses `CustomScreenForm.vue` (library picker; embeds the legacy `CustomForm.vue` designer only for inline entries). Edits in the library apply live to every panel using a screen (server resolves the reference at render time). Keep `src/types/pxd.ts` in sync with the server's `PxdDesign.java`. The designer preview is server-truth via `POST /v1/screen/custom/preview` (`src/service/screens.ts`) — do not add a client-side scene renderer; the edit canvas paints pixels and approximates text only. **pxd v2 adds panel-side animation layers** (`sweep`/`scroll`/`blink`, spec §3.6 — ACMD parametrics compiled server-side; only when the deployment's command encoding is enabled, else a baked t=0 fallback): added/edited in `ParamOverlayPanel.vue` (max 4 per design, single frame, ≤4 distinct text/scroll fonts, coords 0..255 — `validatePxd` mirrors the server rules; adding the first one bumps a v1 design to schemaVersion 2). The designer draws them as static approximations (θ=0 sweep line, head-hold scroll text, dashed region); the preview plays the server-sampled parametric timeline at 100 ms.
- `src/service/` — one module per backend resource; all go through the default `api` axios client.
- `src/stores/AuthStore.ts` — only Pinia store; hydrated in `src/main.ts` after `router.isReady()`.
- `@` alias → `src/`.
- Vuetify components are tree-shaken via `vite-plugin-vuetify` (`autoImport: true, styles: true` in `vite.config.ts`): template usage is auto-imported and per-component styles are injected. **Keep** `import 'vuetify/styles'` in `src/main.ts` — that stylesheet carries only the global layer (CSS reset, typography, `.d-flex`/`.ga-*`/`.text-*` utilities) which the plugin does **not** provide; removing it silently breaks all layout. Do **not** re-add `import * as components from 'vuetify/components'` (that defeats tree-shaking). Directives are still registered globally in `main.ts`. Components used in render functions/JSX must be imported explicitly from `vuetify/components` (e.g. `VSkeletonLoader` in `PanelDetails.vue`); the styles plugin covers those imports too. Route views are lazy-loaded in `src/router/index.ts` — keep it that way, and keep `main.ts` mounting via `router.isReady().then(...)` (a top-level `await` deadlocks lazy chunk loading in production builds). Theme is read from `localStorage`/system preference before mount to avoid a flash — preserve that bootstrap order in `main.ts`.
- Leaflet default marker icons are re-wired in `src/main.ts` for bundling; keep when touching map setup.

## Style

- Prettier: no semicolons, single quotes, width 100. ESLint uses `skip-formatting` — formatting is Prettier's job, don't fight it with ESLint.
- LF line endings enforced via `.gitattributes` and `.editorconfig`.
