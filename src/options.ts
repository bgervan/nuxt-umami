type ModuleOptions = Partial<{
  /**
   * Whether to enable the module
   *
   * @default true
   */
  enabled: boolean;
  /**
   * Your umami endpoint. This is where you would
   * normally load the script from.
   *
   * @required true
   * @example 'https://ijkml.xyz/'
   * @see [How to find?](https://umami.nuxt.dev/api/configuration#finding-config-options).
   */
  host: string;
  /**
   * Unique identifier provided by Umami
   *
   * @required true
   * @example `3c255b6d-678a-42dd-8074-272ee5b78484`
   */
  id: string;
  /**
   * Configure the tracker to only run on specific domains.
   * Provide an array or comma delimited list of domains (without 'http').
   * Leave as `undefined` to run on all domains.
   *
   * @example 'mywebsite.com, mywebsite2.com'
   * @example ['mywebsite.com', 'mywebsite2.com']
   * @default undefined
   */
  domains: string[] | null;
  /**
   * Option to automatically track page views.
   *
   * @default true
   */
  autoTrack: boolean;
  /**
   * Whether or not to track during development (localhost).
   *
   * @default false
   */
  ignoreLocalhost: boolean;
  /**
   * Self-hosted Umami lets you set a COLLECT_API_ENDPOINT, which is:
   * - `/api/collect` by default in Umami v1
   * - `/api/send` by default in Umami v2.
   * See [Umami Docs](https://umami.is/docs/environment-variables).
   */
  customEndpoint: string | null;
  /**
   * Use Umami tags for A/B testing or to group events.
   *
   * See [Documentation](https://umami.nuxt.dev/api/configuration#umami-tag).
   */
  tag: string | null;
  /**
   * Enable `v-umami` directive
   *
   * @default false
   */
  useDirective: boolean;
  /**
   * Collect Core Web Vitals (LCP, FCP, CLS, INP, TTFB) and report them to Umami.
   * Requires Umami v3.1.0 or later.
   *
   * @default false
   */
  performance: boolean;
  /**
   * Load Umami's `recorder.js` to enable **heatmaps** (click + scroll maps).
   *
   * Requires self-hosted Umami **v3.1.0+**, and Heatmaps must be enabled for the
   * website in the Umami dashboard (Websites → Edit → Replays & Heatmaps), where
   * the sample rate is also configured.
   *
   * Note: `recorder.js` loads from your Umami host and carries the website id, so
   * enabling it exposes both in the page even in `proxy: 'cloak'` mode (the
   * recorder cannot be cloaked).
   *
   * @default false
   */
  heatmap: boolean;
  /**
   * Load Umami's `recorder.js` to enable **session replays**.
   *
   * Requires self-hosted Umami **v3.1.0+**, and Replays must be enabled for the
   * website in the Umami dashboard (Websites → Edit → Replays & Heatmaps), where
   * sample rate, mask level, max duration and block selector are configured.
   *
   * Shares the same `recorder.js` as {@link heatmap} — enabling either loads it
   * once; the dashboard decides what is recorded. Session recording is invasive, so
   * consider `recorderAutoLoad: false` + loading via `umLoadRecorder()` after
   * explicit consent.
   *
   * @default false
   */
  replays: boolean;
  /**
   * Auto-load the Umami `recorder.js` (heatmaps/replays) on page load when
   * `heatmap`/`replays` is enabled. Set to **`false`** to load it on demand instead
   * via `umLoadRecorder()` — e.g. only after the user has given consent.
   *
   * @default true
   */
  recorderAutoLoad: boolean;
  /**
   * Enable warning and error logs in production
   *
   * @default false
   */
  logErrors: boolean;
  /**
   * API proxy mode
   *
   * @see [Documentation](https://umami.nuxt.dev/api/configuration#proxy-mode).
   *
   * @default false
   */
  proxy: false | 'direct' | 'cloak';
  /**
   * Consistent trailing slash
   *
   * @default 'any'
   * @deprecated use `urlOptions` (DOCX)
   */
  trailingSlash: 'any' | 'always' | 'never';
  /**
   * Exclude query/search params from tracked urls
   *
   * false: `/page/link?search=product-abc&filter=asc`
   *
   * true: `/page/link`
   *
   * @default false
   * @deprecated use `urlOptions` (DOCX)
   */
  excludeQueryParams: boolean;
  /**
   * Configure how urls are sent to the server
   */
  urlOptions?: Partial<{
  /**
   * Enforce consistent trailing slash
   *
   * @default 'any'
   */
    trailingSlash: 'any' | 'always' | 'never';
    /**
     * Exclude query/search params from tracked urls
     *
     * false: `/page/link?search=product-abc&filter=asc`
     *
     * true: `/page/link`
     *
     * @default false
     */
    excludeSearch: boolean;
    /**
     * Exclude hash from tracked urls
     *
     * false: `/page/link#contact`
     *
     * true: `/page/link`
     *
     * @default false
     */
    excludeHash: boolean;
  }>;
}>;

export type { ModuleOptions };
