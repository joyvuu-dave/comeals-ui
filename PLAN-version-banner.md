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

## Options

### Option A: Use Vite's built-in manifest (Recommended)

Vite can generate a manifest file when `build.manifest` is enabled.

**Changes:**

1. `vite.config.js` -- enable manifest output:
   ```js
   build: {
     outDir: "build",
     manifest: true,   // produces build/.vite/manifest.json
   }
   ```

2. `version_banner.jsx` -- update to match Vite's output:
   - On mount, find the running entry script: `script[type="module"][src*="/assets/"]`
   - Periodically fetch `/.vite/manifest.json`
   - Compare the entry point's hashed filename with the current script src

3. `server.js` -- verify that `/.vite/manifest.json` is served by the static middleware.
   The file lives at `build/.vite/manifest.json`. The `express.static(buildPath)` call
   should serve it at `/.vite/manifest.json` automatically (dotfiles default to "ignore"
   in Express, but `.vite` is a directory, not a dotfile -- verify this).

**Pros:** Uses Vite's built-in feature. Manifest format is stable. Minimal code change.
**Cons:** Need to verify Express serves the `.vite/` directory. May need to add a dotfiles option.

### Option B: Fetch and parse index.html

1. On mount, capture the current `<script type="module">` src attribute
2. Periodically fetch `/index.html` with a cache-busting query param
3. Parse the HTML to extract the script src
4. Compare with the captured value

**Pros:** No build config changes needed.
**Cons:** Parsing HTML is fragile. Fetching the full HTML is heavier than a small JSON manifest.

### Option C: Generate a build-id file

1. Add a build step (Vite plugin or npm script) that writes `build/build-id.json` containing a timestamp or git hash
2. Inject the current build ID into the HTML via Vite's `define` config or an inline script
3. Periodically fetch `/build-id.json` and compare

**Pros:** Simple comparison logic. Small payload.
**Cons:** Requires custom build tooling. Another moving part to maintain.

## Recommendation

**Option A** is the cleanest. It uses an existing Vite feature, requires changes to only 3 files, and the manifest is a small JSON document.

## Implementation Steps

1. Add `manifest: true` to `vite.config.js` build options
2. Run `npm run build` and verify `build/.vite/manifest.json` exists
3. Start the Express server and verify `GET /.vite/manifest.json` returns the file
   - If Express's `dotfiles: "ignore"` blocks it, add an explicit route or serve `.vite/` separately
4. Rewrite `version_banner.jsx`:
   - `componentDidMount`: query `script[type="module"][src^="/assets/"]` to capture the current entry filename
   - `checkForUpdate`: fetch `/.vite/manifest.json`, read the entry point's `file` value, compare
5. Test end-to-end: deploy build A, load the app, deploy build B, wait for poll interval, verify banner appears

## Files to Change

- `vite.config.js`
- `src/components/app/version_banner.jsx`
- `server.js` (if dotfiles serving needs adjustment)

## Risks

- The `.vite/` directory name is a Vite convention that could change in future major versions (currently stable in Vite 5/6)
- If the Express static middleware blocks dotfile directories, the manifest won't be served and the check will silently fail (same as current behavior -- no regression)
