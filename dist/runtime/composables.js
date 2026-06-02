import { buildPathUrl, collect } from "#build/umami.config.mjs";
import { useRuntimeConfig } from "#imports";
import { logger } from "./logger.js";
import { earlyPromise, flattenObject, isValidString } from "./utils.js";
let configChecks;
let staticPayload;
let queryRef;
let queryRefConsumed = false;
let identifyId;
function runPreflight() {
  if (typeof window === "undefined")
    return "ssr";
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
    referrer: ref,
    ...identity ? { id: identity } : null
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
export { startPerformanceTracking, umIdentify, umTrackEvent, umTrackRevenue, umTrackView };
