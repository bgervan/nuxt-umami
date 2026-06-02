# Nuxt Umami

[![License](https://img.shields.io/npm/l/nuxt-umami?style=flat-square)](https://github.com/ijkml/nuxt-umami/blob/main/LICENSE)

Integrate [**Umami Analytics**](https://umami.is/) into your Nuxt websites/applications.

---

## Fork: bgervan/nuxt-umami

A fork of [colinmollenhour/nuxt-umami](https://github.com/colinmollenhour/nuxt-umami) (itself a fork of
upstream [ijkml/nuxt-umami](https://github.com/ijkml/nuxt-umami)), tracking the **`next-major` (v3.4.0)**
line. It bundles everything from those forks **plus heatmaps and session replays**.

### What this fork adds over upstream `ijkml/nuxt-umami`

**New here (`bgervan`):**
- 🔥 **`heatmap`** option — loads Umami's `recorder.js` to enable click + scroll **heatmaps**
- 🎥 **`replays`** option — enables Umami **session replays** (shares the same `recorder.js`)

**Inherited from `next-major` / `colinmollenhour`:**
- 🆔 **Distinct user ID** via `umIdentify(id)` — auto-attached to every later pageview/event (Umami v2.18.0+)
- 📊 **`performance`** option — Core Web Vitals: LCP, FCP, CLS, INP, TTFB (Umami v3.1.0+)
- 🌍 Accurate geo-location with `proxy: 'cloak'` on Netlify/Vercel
- 🧭 Fixed duplicate pageviews with nested `<NuxtPage>` layouts
- ♻️ Runtime env-var support — change endpoint/ID at server start, no rebuild
- 📦 `@nuxt/kit` / `@nuxt/schema` relaxed to `>=3.15.4` (Nuxt 4 compatible)

> **Heatmaps & replays** require **self-hosted Umami v3.1.0+** and must be enabled per-website in the
> Umami dashboard (Websites → Edit → Replays & Heatmaps), where the sample rate / mask level / max
> duration are set. Both load the same `recorder.js` — the dashboard decides what is recorded. Because
> `recorder.js` carries your host + website id (it's a public script), it **cannot be hidden with
> `proxy: 'cloak'`**.

### Install this fork

Not published to npm — install from the **release tarball** (the supported method):

```sh
pnpm add https://github.com/bgervan/nuxt-umami/releases/download/v3.4.0/nuxt-umami-3.4.0.tgz
# or
npm install https://github.com/bgervan/nuxt-umami/releases/download/v3.4.0/nuxt-umami-3.4.0.tgz
# or
yarn add https://github.com/bgervan/nuxt-umami/releases/download/v3.4.0/nuxt-umami-3.4.0.tgz
```

> Replace `v3.4.0` / `3.4.0` with the actual release tag and tarball version.
> **Note:** since it isn't on npm, `npx nuxi module add` won't work — register the module manually below.

### Configure

```ts
export default defineNuxtConfig({
  modules: ['nuxt-umami'],
  umami: {
    host: 'https://your-umami-instance.example.com',
    id: 'your-website-id',
    autoTrack: true,
    // performance: true,    // Core Web Vitals (Umami v3.1.0+)
    // heatmap: true,        // click + scroll heatmaps via recorder.js (v3.1.0+)
    // replays: true,        // session replays via recorder.js (v3.1.0+)
    // proxy: 'cloak',       // hide your Umami endpoint (incompatible with heatmap/replays)
    // useDirective: true,
    // ignoreLocalhost: true,
    // domains: ['mysite.com'],
  },
});
```

Identify logged-in users — the distinct ID is then auto-included on all subsequent calls:

```ts
umIdentify('user-123')                    // ID only
umIdentify('user-123', { plan: 'pro' })   // ID + session data
```

The `host`/`id` are build-time defaults; override at server start via the env vars described below.

Full configuration reference: [umami.nuxt.dev/api/configuration](https://umami.nuxt.dev/api/configuration)

### Environment variables

Config values are stored in Nuxt `runtimeConfig` and can be overridden at **server start**
(no rebuild required) using these env vars:

```sh
# proxy: false or proxy: 'direct'  (public — included in client bundle)
NUXT_PUBLIC_UMAMI_WEBSITE=your-website-id
NUXT_PUBLIC_UMAMI_ENDPOINT=https://your-umami-instance.example.com/api/send

# proxy: 'cloak'  (server-only — never exposed to the client)
NUXT_UMAMI_WEBSITE=your-website-id
NUXT_UMAMI_ENDPOINT=https://your-umami-instance.example.com/api/send

# Optional — overrides the tag at runtime (all proxy modes)
NUXT_PUBLIC_UMAMI_TAG=my-tag
```

> Note: `NUXT_PUBLIC_UMAMI_ENDPOINT` is the fully-resolved endpoint URL including the
> path (e.g. `/api/send`). It corresponds to `host` + `customEndpoint` from the module
> options, not `host` alone.

### Usage

All composables are auto-imported. See [umami.nuxt.dev/api/usage](https://umami.nuxt.dev/api/usage) for the full API.

```ts
// Track a page view (called automatically if autoTrack: true)
umTrackView();

// Track a named event with optional data
umTrackEvent('signup-click', { plan: 'pro' });

// Identify an authenticated user (SaaS portal use case)
umIdentify('[email protected]');
umIdentify('[email protected]', { plan: 'pro', company: 'Acme' });

// Track revenue
umTrackRevenue('subscription', 49, 'USD');
```

### Fork changes vs upstream v3.2.1

| Change | Description |
|--------|-------------|
| SPA referral attribution | `?ref=` param was sent on every page, not just the landing page |
| Duplicate pageview | Nested `<NuxtPage>` caused double-tracking per navigation |
| `umIdentify` distinct ID | Added `(id)` and `(id, data)` signatures; ID auto-included in all subsequent events |
| Cloak proxy geo-location | `X-Forwarded-For` now forwarded so Umami sees the real client IP |
| Event name length | Names over 50 chars are warned and pre-truncated to match Umami's server limit |
| Currency normalization | `umTrackRevenue` now always emits uppercase currency codes |
| Nuxt v4 peer deps | `@nuxt/kit`/`@nuxt/schema` ranges broadened to `>=3.15.4` |
| Runtime config typing | `runtimeConfig.umami` is now properly typed via module augmentation |
| Structured logging | Module setup uses `useLogger` from `@nuxt/kit` instead of `console.warn` |
| Proxy validator | Body key-count check removed; forward-compatible with Umami API additions |
| Runtime env vars | Config moved to Nuxt `runtimeConfig`; `NUXT_PUBLIC_UMAMI_*` / `NUXT_UMAMI_*` override at server start, not build time |
| `performance` option | Core Web Vitals — LCP/FCP/CLS/INP/TTFB (Umami v3.1.0+) |
| **`heatmap` option** *(this fork)* | Loads Umami `recorder.js` for click + scroll heatmaps (Umami v3.1.0+) |
| **`replays` option** *(this fork)* | Umami session replays via the same `recorder.js` (Umami v3.1.0+) |

---

## Prompt for AI assistants

Use this prompt when setting up this module in a new project:

---

> Install the `bgervan/nuxt-umami` fork of the nuxt-umami module. This is a fork of
> [ijkml/nuxt-umami](https://github.com/ijkml/nuxt-umami) adding distinct-ID identify,
> Core Web Vitals, and Umami heatmaps/replays; the full API and configuration docs are at
> https://umami.nuxt.dev/ but installation differs from the official docs.
>
> **Install from the release tarball** (the only supported method — `npx nuxi module add`
> and `github:` installs do not work for this fork):
> ```sh
> pnpm add https://github.com/bgervan/nuxt-umami/releases/download/v3.4.0/nuxt-umami-3.4.0.tgz
> ```
>
> **Register in `nuxt.config.ts`:**
> ```ts
> export default defineNuxtConfig({
>   modules: ['nuxt-umami'],
>   umami: {
>     host: 'https://your-umami-instance.example.com',
>     id: 'your-website-id',
>     autoTrack: true,
>     proxy: 'cloak',
>   },
> });
> ```
>
> **Environment variables** — these override the `host`/`id` values above at server start
> (no rebuild needed). Use the set that matches your `proxy` setting:
> ```sh
> # proxy: 'cloak'  (server-only — never exposed to the client)
> NUXT_UMAMI_WEBSITE=your-website-id
> NUXT_UMAMI_ENDPOINT=https://your-umami-instance.example.com/api/send
>
> # proxy: false (default) or proxy: 'direct'  (public — in client bundle)
> NUXT_PUBLIC_UMAMI_WEBSITE=your-website-id
> NUXT_PUBLIC_UMAMI_ENDPOINT=https://your-umami-instance.example.com/api/send
> ```
>
> **Auto-imported composables** (no imports needed in `<script setup>`):
> - `umTrackView(path?, referrer?)` — track a page view
> - `umTrackEvent(name, data?)` — track a named event; `name` max 50 chars
> - `umIdentify(userId)` / `umIdentify(userId, data)` / `umIdentify(data)` — identify
>   the current user; the ID persists across all subsequent events in the session
> - `umTrackRevenue(name, amount, currency?)` — track a revenue event
>
> **Directive** (enable with `useDirective: true` in config):
> ```html
> <button v-umami="'cta-click'">Get started</button>
> ```
>
> Full config and usage docs: https://umami.nuxt.dev/api/configuration and
> https://umami.nuxt.dev/api/usage

---

<hr />

MIT License ©2022-PRESENT [ML](https://github.com/ijkml/)
