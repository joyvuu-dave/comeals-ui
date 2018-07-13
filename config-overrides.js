const { rewireWorkboxGenerate } = require("react-app-rewire-workbox");

module.exports = function override(config, env) {
  if (env === "production") {
    console.log("Production build - Adding Workbox for PWAs");
    const workboxConfig = {
      clientsClaim: true
    };
    config = rewireWorkboxGenerate(workboxConfig)(config, env);
  }

  return config;
};
