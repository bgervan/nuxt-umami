import { defineNuxtPlugin, useRouter, useRuntimeConfig } from "#app";
import {
  captureFrameworkError,
  releaseErrors,
  startErrorTracking,
  startPerformanceTracking,
  umLoadRecorder,
  umTrackView
} from "./composables.js";
import { directive } from "./directive.js";
export default defineNuxtPlugin({
  name: "umami-tracker",
  parallel: true,
  async setup(nuxtApp) {
    const { useDirective, autoTrack, performance, errors, recorder, recorderAutoLoad } = useRuntimeConfig().public.umami;
    if (useDirective)
      nuxtApp.vueApp.directive("umami", directive);
    if (performance)
      startPerformanceTracking();
    if (errors && import.meta.client) {
      startErrorTracking();
      nuxtApp.hook("vue:error", (error) => captureFrameworkError(error, "vue"));
      nuxtApp.hook("app:error", (error) => captureFrameworkError(error, "nuxt"));
      nuxtApp.hook("app:created", releaseErrors);
    }
    if (recorder && recorderAutoLoad)
      umLoadRecorder();
    if (autoTrack) {
      let lastTrackedPath;
      let pendingTimer;
      const router = useRouter();
      nuxtApp.hook("page:finish", () => {
        const currentPath = router.currentRoute.value.fullPath;
        if (currentPath === lastTrackedPath)
          return;
        clearTimeout(pendingTimer);
        pendingTimer = setTimeout(() => {
          const path = router.currentRoute.value.fullPath;
          if (path === lastTrackedPath)
            return;
          lastTrackedPath = path;
          umTrackView();
        }, 250);
      });
    }
  }
});
