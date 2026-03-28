module.exports = function override(config, env) {
  if (env === "production") {
    // Remove SWPrecacheWebpackPlugin so no service worker is auto-generated.
    // The hand-written public/service-worker.js (a no-op that clears caches
    // and passes all requests through) will be copied to build/ instead.
    config.plugins = config.plugins.filter(
      function (plugin) {
        return plugin.constructor.name !== "SWPrecacheWebpackPlugin";
      }
    );
  }

  return config;
};
