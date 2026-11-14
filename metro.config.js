// Learn more: https://docs.expo.dev/guides/customizing-metro/
/** @type {import('expo/metro-config').MetroConfig} */
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-sqlite runs SQLite as WebAssembly on web: let Metro bundle .wasm files
config.resolver.assetExts.push("wasm");

// expo-sqlite on web needs SharedArrayBuffer, which browsers only allow
// with these two headers (dev server only — production hosting needs them too)
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    middleware(req, res, next);
  };
};

module.exports = config;
