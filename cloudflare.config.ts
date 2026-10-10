import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === "development";

  return {
    worker: defineWorker({
      name: isDevelopment ? "piggy-track-vinext-app-dev" : "piggy-track-vinext-app-prod",
      entrypoint: "vinext/server/fetch-handler",
      compatibilityDate: "2026-09-29",
      compatibilityFlags: ["nodejs_compat"],
      assets: {
        notFoundHandling: "none",
      },
      env: {
        ASSETS: bindings.assets(),
        IMAGES: bindings.images(),
      },
    }),
  };
});
