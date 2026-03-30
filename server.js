const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3001;
const API_URL = process.env.API_URL || "http://localhost:3000";

// Proxy /api/ requests to the backend.
// The path filter is passed to createProxyMiddleware (not to app.use) so that
// Express does NOT strip the /api prefix from req.url before forwarding.
// With app.use("/api", proxy), Express strips the mount path, causing the
// backend to receive /v1/... instead of /api/v1/... — a 404.
app.use(
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
    pathFilter: "/api",
  })
);

const buildPath = path.join(__dirname, "build");

// Serve Vite's build manifest for the VersionBanner deploy-detection poll.
// express.static won't serve it because .vite/ is a dotfile directory
// (dotfiles default to "ignore").
app.get("/.vite/manifest.json", (req, res) => {
  res.set("Cache-Control", "no-cache");
  res.sendFile(path.join(buildPath, ".vite", "manifest.json"), {
    dotfiles: "allow",
  });
});

// Hashed assets under /assets — cache forever (filenames change on each build).
app.use(
  "/assets",
  express.static(path.join(buildPath, "assets"), {
    maxAge: "1y",
    immutable: true,
  })
);

// Everything else (index.html, manifest.json, icons) — always revalidate
// with the server.
app.use(
  express.static(buildPath, {
    setHeaders: function (res) {
      res.setHeader("Cache-Control", "no-cache");
    },
  })
);

// SPA fallback — serve index.html for all non-file routes.
app.get("/{*path}", (req, res) => {
  res.set("Cache-Control", "no-cache");
  res.sendFile(path.join(buildPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Comeals UI serving on port ${PORT}, proxying API to ${API_URL}`);
});
