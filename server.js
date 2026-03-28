const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 3001;
const API_URL = process.env.API_URL || "http://localhost:3000";

// Proxy /api/ requests to the backend
app.use(
  "/api",
  createProxyMiddleware({
    target: API_URL,
    changeOrigin: true,
  })
);

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, "build")));

// SPA fallback — serve index.html for all non-file routes
app.get("/{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Comeals UI serving on port ${PORT}, proxying API to ${API_URL}`);
});
