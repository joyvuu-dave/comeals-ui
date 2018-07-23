const { rewireWorkboxGenerate } = require("react-app-rewire-workbox");

module.exports = function override(config, env) {
  if (env === "production") {
    config = rewireWorkboxGenerate()(config, env);
  }

  return config;
};
