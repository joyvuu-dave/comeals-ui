# Plan: Fix VersionBanner After Vite Migration

## Problem

The `VersionBanner` component (`src/components/app/version_banner.jsx`) detects new deployments by:

1. Finding the current `main.js` script tag via `script[src*="/static/js/main."]`
2. Periodically fetching `/asset-manifest.json` and comparing filenames

Both rely on Create React App conventions that no longer exist after the Vite migration:

- Vite generates assets in `/assets/`, not `/static/js/`
- Vite does not produce `asset-manifest.json` (that was a CRA convention)

## Current Behavior

The version check silently fails. `_currentMainJs` is always `null` because no `<script>` tag matches the `/static/js/main.` selector, so `checkForUpdate()` returns early on every poll. The banner never appears, even after a new deploy.

## Approach: Use Vite's Built-In Manifest

Vite can generate a manifest file when `build.manifest` is enabled.

### Changes

1. **`vite.config.js`** — enable manifest output:
   ```js
   build: {
     outDir: "build",
     manifest: true,   // produces build/.vite/manifest.json
   }
   ```

2. **`version_banner.jsx`** — update to match Vite's output:
   - On mount, find the running entry script: `script[type="module"][src^="/assets/"]`
   - Periodically fetch `/.vite/manifest.json`
   - Find the entry point by looking for the object with `isEntry: true`
     (more resilient than hardcoding `"src/index.jsx"` as the key)
   - Compare the entry's `file` value against the current script src
   - Normalize paths before comparing: the manifest `file` field is a relative
     path (`assets/index-abc123.js`) while the script `src` attribute has a
     leading slash (`/assets/index-abc123.js`). Strip the leading `/` from the
     src before comparing.

3. **`server.js`** — two fixes for CRA-to-Vite migration gaps:

   a. **Serve the Vite manifest.** Express's `dotfiles` option defaults to
      `"ignore"` and applies to any path component starting with `.`, including
      directories. This means `express.static` will silently 404 requests to
      `/.vite/manifest.json`. Add an explicit route before the static middleware.
      Note: `res.sendFile` also uses the `send` library internally with
      `dotfiles: "ignore"`, so `dotfiles: "allow"` must be passed as an option:
      ```js
      app.get('/.vite/manifest.json', (req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(path.join(buildPath, '.vite', 'manifest.json'), {
          dotfiles: 'allow',
        });
      });
      ```
      This is preferable to changing `dotfiles: "allow"` globally, which could
      accidentally expose `.git/` or other dot-prefixed directories.

   b. **Fix hashed-asset caching.** The existing `/static` route with
      `maxAge: "1y"` is dead CRA code — Vite never writes to `/static`.
      Meanwhile Vite's content-hashed assets in `/assets/` are served by the
      general static middleware with `Cache-Control: no-cache`, causing
      re-downloads on every page load. Change the route from `/static` to
      `/assets` and point it at `path.join(buildPath, "assets")`.

## Implementation Steps

1. Add `manifest: true` to `vite.config.js` build options
2. Run `npm run build` and verify `build/.vite/manifest.json` exists and inspect its format
3. In `server.js`:
   - Add explicit `GET /.vite/manifest.json` route (before the static middleware)
   - Change `/static` route to `/assets` pointing at `build/assets/`
4. Rewrite `version_banner.jsx`:
   - `componentDidMount`: query `script[type="module"][src^="/assets/"]` to capture the current entry filename
   - `checkForUpdate`: fetch `/.vite/manifest.json`, find the entry with `isEntry: true`, normalize paths, compare
5. Verify: run `npm run build`, start Express server, confirm:
   - `GET /.vite/manifest.json` returns the manifest
   - Hashed assets under `/assets/` return with `Cache-Control` max-age headers
   - Loading the app with one build, rebuilding, and waiting for the poll shows the banner

## Files to Change

- `vite.config.js`
- `src/components/app/version_banner.jsx`
- `server.js`

## Risks

- The `.vite/` directory name is a Vite convention that could change in future major versions (currently stable in Vite 5/6)
- If `build/.vite/manifest.json` doesn't exist (e.g., someone runs an old build script), the explicit route will 404 and the banner will silently not fire — same as current broken behavior, no regression
