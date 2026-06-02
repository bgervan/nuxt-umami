import type { CurrencyCode, EventData, FetchResult } from '../types.js';
/**
 * Enable/disable all Umami tracking at runtime, in memory (no localStorage, so it
 * doesn't add device storage). Use it to honor a cookie-consent opt-out:
 * `umSetEnabled(false)` stops pageviews, events, identify and the recorder.
 */
declare function umSetEnabled(enabled: boolean): void;
/**
 * Track page views
 *
 * Both params are optional and will be automatically inferred
 * @param path url being tracked, eg `/about`, `/contact?by=phone#office`
 * @param referrer page referrer, `document.referrer`
 */
declare function umTrackView(path?: string, referrer?: string): FetchResult;
/**
 * Tracks an event with a custom event type.
 *
 * @param eventName event name, eg 'CTA-button-click'
 * @param eventData additional data for the event, provide an object in the format
 * `{key: value}`, where `key` = `string`, `value` = `string | number | boolean`.
 */
declare function umTrackEvent(eventName: string, eventData?: EventData): FetchResult;
/**
 * Save data about the current session and optionally identify the user.
 *
 * Supports three call signatures matching the official Umami tracker:
 * - `umIdentify(uniqueId)` — set a distinct user ID (Umami v2.18.0+)
 * - `umIdentify(uniqueId, sessionData)` — set ID and session data together
 * - `umIdentify(sessionData)` — set session data only (original behaviour)
 *
 * The distinct ID is stored in a module-level closure and automatically
 * included in all subsequent event and pageview payloads, matching the
 * behaviour of the official Umami tracker script.
 *
 * @see [v2.13.0 release](https://github.com/umami-software/umami/releases/tag/v2.13.0)
 * @see [Umami Docs — Identify](https://umami.is/docs/tracker-functions)
 *
 * @param uniqueIdOrData distinct user ID string (max 50 chars) **or** session data object
 * @param sessionData session data when first arg is a distinct ID
 */
declare function umIdentify(uniqueId: string, sessionData?: EventData): FetchResult;
declare function umIdentify(sessionData?: EventData): FetchResult;
/**
 * Tracks financial performance
 * @see [Umami Docs](https://umami.is/docs/reports/report-revenue)
 *
 * @param eventName [revenue] event name
 * @param revenue revenue / amount
 * @param currency currency code (defaults to USD)
 * ([ISO 4217](https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes))
 */
declare function umTrackRevenue(eventName: string, revenue: number, currency?: CurrencyCode): FetchResult;
declare function startPerformanceTracking(): () => void;
/**
 * Load Umami's `recorder.js` (heatmaps / session replays) **on demand** — call it
 * after the user has given (explicit) consent. Idempotent, client-only, and gated
 * by `runPreflight()` so it respects `umSetEnabled(false)`, the `umami.disabled`
 * flag and domain rules. No-op unless `heatmap`/`replays` are enabled in config.
 */
declare function umLoadRecorder(): boolean;
/** Remove the recorder.js script (best-effort; recording may continue until reload). */
declare function umUnloadRecorder(): void;
export { startPerformanceTracking, umIdentify, umLoadRecorder, umSetEnabled, umTrackEvent, umTrackRevenue, umTrackView, umUnloadRecorder, };
