import { defineNuxtPlugin, useRouter, useRuntimeConfig } from "#app";
import { startPerformanceTracking, umLoadRecorder, umTrackView } from "./composables.js";
import { directive } from "./directive.js";
export default defineNuxtPlugin({
  name: "umami-tracker",
  parallel: true,
  async setup(nuxtApp) {
    const { useDirective, autoTrack, performance, recorder, recorderAutoLoad } = useRuntimeConfig().public.umami;
    if (useDirective)
      nuxtApp.vueApp.directive("umami", directive);
    if (performance)
      startPerformanceTracking();
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
