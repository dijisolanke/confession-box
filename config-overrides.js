const { override, addWebpackAlias } = require("customize-cra");
const path = require("path");

module.exports = override(
  addWebpackAlias({
    stream: path.resolve(__dirname, "node_modules/stream-browserify"),
    process: path.resolve(__dirname, "node_modules/process"),
  })
);
