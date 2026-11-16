import { buildPathUrl, collect } from "#build/umami.config.mjs";
import { useRuntimeConfig } from "#imports";
import { errorPagePath, occurrenceId, scrubErrorTags, scrubErrorText } from "./error-utils.js";
import { logger } from "./logger.js";
import { earlyPromise, flattenObject, isValidString } from "./utils.js";
let configChecks;
let staticPayload;
let queryRef;
let queryRefConsumed = false;
let identifyId;
let trackingEnabled = true;
function umSetEnabled(enabled) {
  trackingEnabled = enabled !== false;
}
function runPreflight() {
  if (typeof window === "undefined")
    return "ssr";
  if (!trackingEnabled)
    return "disabled";
  if (window.localStorage.getItem("umami.disabled") === "1")
    return "local-storage";
  if (configChecks)
    return configChecks;
  configChecks = function() {
    const { ignoreLocalhost, domains } = useRuntimeConfig().public.umami;
    const hostname = window.location.hostname;
    if (ignoreLocalhost && hostname === "localhost")
      return "localhost";
    if (domains && !domains.includes(hostname))
      return "domain";
    return true;
  }();
  return configChecks;
}
;
function getStaticPayload() {
  if (staticPayload)
    return staticPayload;
  const {
    location: { hostname },
    screen: { width, height },
    navigator: { language }
  } = window;
  const { tag } = useRuntimeConfig().public.umami;
  staticPayload = {
    hostname,
    language,
    screen: `${width}x${height}`,
    ...tag ? { tag } : null
  };
  return staticPayload;
}
function getQueryRef() {
  if (queryRefConsumed)
    return "";
  if (typeof queryRef !== "string") {
    const params = new URL(window.location.href).searchParams;
    queryRef = params.get("referrer") || params.get("ref") || "";
  }
  return queryRef;
}
function consumeQueryRef() {
  queryRefConsumed = true;
  queryRef = "";
}
function getPayload() {
  const { referrer, title } = window.document;
  const { origin, href } = window.location;
  const url = buildPathUrl(href);
  const tag = window.localStorage.getItem("umami.tag");
  const ref = referrer && !referrer.startsWith(origin) ? referrer : getQueryRef();
  return {
    ...getStaticPayload(),
    ...tag ? { tag } : null,
    // Auto-include the distinct ID on all payloads after umIdentify is called,
    // matching the behaviour of the official Umami tracker script.
    ...identifyId ? { id: identifyId } : null,
    url,
    title,
    referrer: ref
  };
}
;
function umTrackView(path, referrer) {
  const check = runPreflight();
  if (check === "ssr")
    return earlyPromise(false);
  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }
  const url = buildPathUrl(isValidString(path) ? path : null);
  const result = collect({
    type: "event",
    payload: {
      ...getPayload(),
      ...isValidString(url) && { url },
      ...isValidString(referrer) && { referrer }
    }
  });
  consumeQueryRef();
  return result;
}
function umTrackEvent(eventName, eventData) {
  const check = runPreflight();
  if (check === "ssr")
    return earlyPromise(false);
  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }
  const data = flattenObject(eventData);
  let name = eventName;
  if (!isValidString(eventName)) {
    logger("event-name");
    name = "#unknown-event";
  } else if (eventName.length > 50) {
    logger("event-name-length");
    name = eventName.slice(0, 50);
  }
  return collect({
    type: "event",
    payload: {
      name,
      ...getPayload(),
      ...data && { data }
    }
  });
}
function umIdentify(uniqueIdOrData, sessionData) {
  const check = runPreflight();
  if (check === "ssr")
    return earlyPromise(false);
  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }
  let id;
  let data;
  if (typeof uniqueIdOrData === "string") {
    id = uniqueIdOrData.trim().slice(0, 50) || void 0;
    data = flattenObject(sessionData);
  } else {
    data = flattenObject(uniqueIdOrData ?? void 0);
  }
  if (id)
    identifyId = id;
  return collect({
    type: "identify",
    payload: {
      ...getPayload(),
      ...id ? { id } : null,
      ...data ? { data } : null
    }
  });
}
function umTrackRevenue(eventName, revenue, currency = "USD") {
  const $rev = typeof revenue === "number" ? revenue : Number(revenue);
  if (Number.isNaN($rev) || !Number.isFinite(revenue)) {
    logger("revenue", revenue);
    return earlyPromise(false);
  }
  let $cur = null;
  if (typeof currency === "string" && /^[A-Z]{3}$/.test(currency.trim().toUpperCase()))
    $cur = currency.trim().toUpperCase();
  else
    logger("currency", `Got: ${currency}`);
  return umTrackEvent(eventName, {
    revenue: $rev,
    ...$cur ? { currency: $cur } : null
  });
}
function startPerformanceTracking() {
  if (typeof window === "undefined" || typeof PerformanceObserver === "undefined")
    return () => {
    };
  if (runPreflight() !== true)
    return () => {
    };
  const t0 = performance.now();
  let flushed = false;
  const metrics = { ttfb: 0, fcp: 0, lcp: 0, cls: 0, inp: 0 };
  const [nav] = performance.getEntriesByType("navigation");
  if (nav) {
    const activationStart = nav.activationStart ?? 0;
    metrics.ttfb = Math.max(nav.responseStart - activationStart, 0);
  }
  const observers = [];
  function observe(type, cb, extra) {
    try {
      const obs = new PerformanceObserver(cb);
      obs.observe({ type, buffered: true, ...extra });
      observers.push(obs);
    } catch {
    }
  }
  observe("paint", (list) => {
    const entry = list.getEntriesByName("first-contentful-paint")[0];
    if (entry)
      metrics.fcp = entry.startTime;
  });
  observe("largest-contentful-paint", (list) => {
    const entries = list.getEntries();
    if (entries.length)
      metrics.lcp = entries.at(-1).startTime;
  });
  let clsSession = 0;
  let clsSessionStart = -1;
  observe("layout-shift", (list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput)
        continue;
      if (clsSessionStart >= 0 && e.startTime - clsSessionStart < 1e3)
        clsSession += e.value;
      else
        clsSession = e.value;
      clsSessionStart = e.startTime;
      if (clsSession > metrics.cls)
        metrics.cls = clsSession;
    }
  });
  observe("event", (list) => {
    for (const e of list.getEntries()) {
      if (e.duration > metrics.inp)
        metrics.inp = e.duration;
    }
  }, { durationThreshold: 40 });
  let timer;
  function onHide() {
    if (document.visibilityState === "hidden")
      flush();
  }
  function flush() {
    if (flushed)
      return;
    flushed = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onHide);
    for (const obs of observers) {
      try {
        obs.disconnect();
      } catch {
      }
    }
    if (runPreflight() !== true)
      return;
    collect({
      type: "performance",
      payload: {
        ...getPayload(),
        ttfb: metrics.ttfb,
        fcp: metrics.fcp,
        lcp: metrics.lcp,
        cls: metrics.cls,
        inp: metrics.inp,
        duration: Math.round(performance.now() - t0)
      }
    });
  }
  timer = setTimeout(flush, 1e4);
  document.addEventListener("visibilitychange", onHide);
  return flush;
}
const ERRORS_PER_MINUTE = 20;
const MAX_ERROR_BYTES = 48e3;
const seenErrors = /* @__PURE__ */ new WeakMap();
let errorBucket = 0;
let errorCount = 0;
let errorsReady = false;
const pendingErrors = [];
function sendError(payload) {
  if (runPreflight() !== true)
    return;
  const load = { type: "error", payload };
  if (new TextEncoder().encode(JSON.stringify(load)).byteLength > MAX_ERROR_BYTES)
    return;
  void collect(load);
}
function releaseErrors() {
  errorsReady = true;
  for (const payload of pendingErrors.splice(0))
    sendError(payload);
}
function captureError(error, options = {}, handled = true) {
  try {
    const config = useRuntimeConfig().public.umami;
    if (!config.errors)
      return;
    const check = runPreflight();
    if (check !== true) {
      if (check !== "ssr")
        logger(check);
      return;
    }
    const now = Date.now();
    const minute = Math.floor(now / 6e4);
    if (errorBucket !== minute) {
      errorBucket = minute;
      errorCount = 0;
    }
    if (errorCount >= ERRORS_PER_MINUTE)
      return;
    if (error && typeof error === "object") {
      if (now - (seenErrors.get(error) || 0) < 1e3)
        return;
      seenErrors.set(error, now);
    }
    errorCount++;
    const value = error && typeof error === "object" ? error : null;
    const message = typeof value?.message === "string" ? value.message : typeof error === "string" ? error : "Non-Error exception";
    const { screen, language } = getStaticPayload();
    const payload = {
      version: 1,
      eventId: occurrenceId(),
      timestamp: now,
      name: scrubErrorText(typeof value?.name === "string" ? value.name : "Error", 200) || "Error",
      message: scrubErrorText(message),
      stack: scrubErrorText(typeof value?.stack === "string" ? value.stack : "", 16e3),
      handled,
      url: errorPagePath(window.location.href),
      release: scrubErrorText(options.release || config.release || "", 100),
      environment: scrubErrorText(options.environment || config.environment || "production", 50),
      tags: scrubErrorTags(options.tags),
      ...options.fingerprint?.length ? { fingerprint: options.fingerprint.slice(0, 5).map((v) => scrubErrorText(String(v), 200)).filter(Boolean) } : null,
      ...identifyId ? { id: identifyId } : null,
      screen,
      language
    };
    if (payload.fingerprint && !payload.fingerprint.length)
      delete payload.fingerprint;
    if (errorsReady)
      sendError(payload);
    else if (pendingErrors.length < ERRORS_PER_MINUTE)
      pendingErrors.push(payload);
  } catch {
  }
}
function umCaptureException(error, options) {
  captureError(error, options, true);
}
function isExpectedHttpError(error) {
  const code = error?.statusCode;
  return typeof code === "number" && code < 500;
}
function startErrorTracking() {
  if (typeof window === "undefined")
    return;
  window.addEventListener("error", (event) => {
    if (!event.message)
      return;
    captureError(
      event.error || {
        name: "Error",
        message: event.message,
        stack: event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : ""
      },
      {},
      false
    );
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (!isExpectedHttpError(event.reason))
      captureError(event.reason, {}, false);
  });
}
function captureFrameworkError(error, source) {
  if (!isExpectedHttpError(error))
    captureError(error, { tags: { source } }, false);
}
let recorderLoaded = false;
function umLoadRecorder() {
  if (typeof window === "undefined")
    return false;
  if (runPreflight() !== true)
    return false;
  const { recorder } = useRuntimeConfig().public.umami;
  if (!recorder)
    return false;
  if (recorderLoaded || document.querySelector("script[data-umami-recorder]")) {
    recorderLoaded = true;
    return true;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = recorder.src;
  script.dataset.websiteId = recorder.id;
  script.setAttribute("data-umami-recorder", "");
  document.head.appendChild(script);
  recorderLoaded = true;
  return true;
}
function umUnloadRecorder() {
  if (typeof window === "undefined")
    return;
  document.querySelectorAll("script[data-umami-recorder]").forEach((el) => el.remove());
  recorderLoaded = false;
}
export {
  captureFrameworkError,
  releaseErrors,
  startErrorTracking,
  startPerformanceTracking,
  umCaptureException,
  umIdentify,
  umLoadRecorder,
  umSetEnabled,
  umTrackEvent,
  umTrackRevenue,
  umTrackView,
  umUnloadRecorder
};
