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
- ANIMATION screens (frames as data URLs + `frameDelayMs`) must stay in sync with the backend record (`AnimationScreenConfig`) and the firmware protocol limits: 2–200 frames, delay 10–65535 ms (u16). `AnimationForm.vue` splits uploaded GIFs via the browser `ImageDecoder` API (feature-detected; not in Safari) and scales frames to 64×32 — same limits the backend enforces.
- `src/service/` — one module per backend resource; all go through the default `api` axios client.
- `src/stores/AuthStore.ts` — only Pinia store; hydrated in `src/main.ts` after `router.isReady()`.
- `@` alias → `src/`.
- Vuetify registers all components/directives globally in `src/main.ts` (no per-file imports, no unplugin auto-import). Theme is read from `localStorage`/system preference before mount to avoid a flash — preserve that bootstrap order in `main.ts`.
- Leaflet default marker icons are re-wired in `src/main.ts` for bundling; keep when touching map setup.

## Style

- Prettier: no semicolons, single quotes, width 100. ESLint uses `skip-formatting` — formatting is Prettier's job, don't fight it with ESLint.
- LF line endings enforced via `.gitattributes` and `.editorconfig`.
