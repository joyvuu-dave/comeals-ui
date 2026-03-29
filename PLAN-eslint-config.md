# Plan: Fix ESLint Configuration (Option B -- Modern Flat Config)

## Problem

The current `.eslintrc.json` extends `react-app`, which requires the
`eslint-config-react-app` package (part of Create React App). This package is
not installed and never has been as a direct dependency. ESLint is not listed in
`devDependencies` either -- `npx eslint` resolves v10.1.0 from the npm cache,
but running it against the project fails because the legacy config file
references a missing preset.

**ESLint is effectively non-functional.** No linting runs during development or
CI.

Additionally, ESLint v10 no longer supports the legacy `.eslintrc.*` format at
all. It only reads `eslint.config.*` (flat config). So even installing
`eslint-config-react-app` would not fix the problem -- a new config format is
required.

## Approach

Replace the broken `.eslintrc.json` with a modern flat config (`eslint.config.js`)
using:

- `@eslint/js` -- standard recommended JS rules
- `eslint-plugin-react` -- React-specific rules (JSX, display names, etc.)
- `eslint-plugin-react-hooks` -- hooks rules (kept light; project barely uses hooks)
- `globals` -- defines `window`, `document`, `navigator`, etc. for the browser env

The project uses **class components with MobX `inject`/`observer`** throughout.
There are zero React hooks in the source code. `React.lazy` and `Suspense` are
used in `src/index.jsx` but these are not hooks. The config should not enforce
hooks-centric rules aggressively.

## Plan Details

### 1. Install packages

```
npm install --save-dev eslint@^9.0.0 @eslint/js eslint-plugin-react eslint-plugin-react-hooks globals
```

Pin to ESLint 9.x rather than 10.x. ESLint 9 introduced flat config as the
default and is the most stable/documented release for this format. The v10 line
is very new (June 2025) and ecosystem plugin support is still catching up.
ESLint 9 is the conservative choice.

Version summary:
| Package                    | Version  |
|----------------------------|----------|
| eslint                     | ^9.0.0   |
| @eslint/js                 | ^9.0.0   |
| eslint-plugin-react        | ^7.37.0  |
| eslint-plugin-react-hooks  | ^5.0.0   |
| globals                    | ^15.0.0  |

### 2. Create `eslint.config.js`

```js
const js = require("@eslint/js");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");
const globals = require("globals");

module.exports = [
  // Base: ESLint recommended rules for all JS files
  js.configs.recommended,

  // -----------------------------------------------------------
  // Source files (src/**) -- browser ESM with JSX
  // -----------------------------------------------------------
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // --- Carry over from current .eslintrc.json ---
      "no-unused-vars": "warn",
      "no-console": "warn",

      // --- React rules (conservative) ---
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-deprecated": "warn",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-key": "warn",
      "react/no-unknown-property": "error",

      // Disable rules that would cause mass noise in this codebase
      "react/prop-types": "off",         // No PropTypes used anywhere
      "react/display-name": "off",       // MobX inject/observer wrappers lose display names
      "react/react-in-jsx-scope": "off", // Not needed with React 17+ JSX transform
                                         // (classic runtime still imports React explicitly,
                                         //  but the rule is unnecessary either way)

      // --- Hooks rules (light touch) ---
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // -----------------------------------------------------------
  // Server & config files -- Node CommonJS
  // -----------------------------------------------------------
  {
    files: ["server.js", "playwright.config.js", "vite.config.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",  // Console is expected in server/tooling code
    },
  },

  // -----------------------------------------------------------
  // Test files -- Node CommonJS (Playwright)
  // -----------------------------------------------------------
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },

  // -----------------------------------------------------------
  // Ignore build output and dependencies
  // -----------------------------------------------------------
  {
    ignores: ["build/**", "node_modules/**"],
  },
];
```

Notes on the config:

- **`sourceType: "commonjs"`** for `server.js`, `playwright.config.js`, and test
  files. These use `require()`/`module.exports`. `vite.config.js` uses ESM
  (`import`/`export default`) but since it has no `"type": "module"` in
  `package.json`, listing it under CJS is the safer default -- Vite handles its
  own config loading regardless of what ESLint thinks.
- **`react/prop-types: "off"`** -- zero files in the project use PropTypes.
  Enabling this would flag every single component (28+ files). Not worth it.
- **`react/display-name: "off"`** -- the MobX `inject("store")(observer(...))`
  pattern wraps class components in ways that lose display names. Enabling this
  would flag most components.
- **`react-hooks/rules-of-hooks: "error"`** is kept because it is cheap (the
  project has no hooks, so it will produce zero errors) and provides a safety
  net if hooks are added later.
- **Classic JSX runtime**: the Vite config uses `jsxRuntime: "classic"`, meaning
  every JSX file does `import React from "react"`. This is fine --
  `react/jsx-uses-react` ensures the React import is not flagged as unused.
  `react/react-in-jsx-scope` is turned off because it is the inverse check
  (warns when React is *not* imported) and is not needed here.
- **The config file itself is CJS** (`module.exports`). This is intentional
  because `package.json` has no `"type": "module"` field, so `.js` files at the
  root are treated as CJS by Node.

### 3. Remove old config

Delete `.eslintrc.json`. ESLint 9 ignores it anyway (flat config takes
precedence), but leaving it around is confusing.

```
rm .eslintrc.json
```

### 4. Add lint script to `package.json`

Add to the `"scripts"` section:

```json
"lint": "eslint src/"
```

This lints only `src/` by default. To also lint server/test files:

```
npx eslint server.js playwright.config.js tests/
```

But keep the npm script focused on `src/` since that is the primary codebase.

### 5. Handling ESM vs CJS

The flat config handles this via separate file-matched config blocks:

| Files                                 | sourceType | globals        |
|---------------------------------------|------------|----------------|
| `src/**/*.{js,jsx}`                   | module     | browser        |
| `server.js`, `playwright.config.js`   | commonjs   | node           |
| `tests/**/*.js`                       | commonjs   | node           |

### 6. Estimated warnings/errors from the new config

Based on manual review of the source files:

| Rule              | Estimated count | Where                                     |
|-------------------|----------------:|-------------------------------------------|
| `no-console`      | ~69 warnings    | Mostly `console.error` in stores (error handlers in data_store.js, resident.js, meal.js) and `console.log` in index.jsx |
| `no-unused-vars`  | ~5-15 warnings  | Likely a handful of unused imports or function parameters across 39 source files. Common pattern: `catch(error)` where `error` is not always used, or destructured imports where not all names are referenced. Hard to know exact count without running it. |
| React rules       | ~0 errors       | The code is well-structured. JSX key usage looks correct. No direct state mutations observed. |
| Hooks rules       | 0               | No hooks in the codebase. |
| **Total**         | **~70-85 warnings, 0 errors** | Almost entirely `no-console` warnings. |

The vast majority of output will be `no-console` warnings from the ~69
`console.error`/`console.log` calls scattered across the stores. These are
intentional error-logging calls in axios catch blocks and can be left as
warnings without any code changes.

If the warning count is annoying, `no-console` can be changed to `"off"` or
scoped to `["warn", { allow: ["error", "warn"] }]` to permit `console.error`
and `console.warn` while still flagging `console.log`.

### 7. Risks and considerations

1. **ESLint 9 vs 10**: ESLint 10 dropped the legacy config format entirely and
   is quite new. Some plugins may not have full v10 compatibility yet. ESLint 9
   is the safer bet and fully supports flat config. If the project later wants
   to move to v10, the flat config will carry over with minimal changes.

2. **No auto-fix on save**: This plan does not set up editor integration (VS
   Code settings, etc.). That can be done separately if desired.

3. **No Prettier conflict handling**: Prettier is installed (`devDependencies`).
   If both ESLint and Prettier run, they may disagree on formatting. Consider
   adding `eslint-config-prettier` later to disable ESLint's formatting rules.
   For now, the recommended rule set does not include formatting rules, so
   conflict risk is low.

4. **vite.config.js sourceType**: `vite.config.js` uses `import`/`export` (ESM
   syntax) but the file extension is `.js` and there is no `"type": "module"` in
   package.json. Vite handles its own config loading, but ESLint may flag syntax
   errors if we lint this file with `sourceType: "commonjs"`. Two options: (a)
   exclude it from linting entirely, or (b) give it its own config block with
   `sourceType: "module"`. Option (b) is shown in the config above as a
   conservative default -- if it causes issues, just move it to the ignores
   list.

5. **No CI integration yet**: This plan adds a local `npm run lint` command but
   does not wire it into CI/CD. That is a separate step.

6. **`react/jsx-uses-react` and classic runtime**: Because the Vite config uses
   `jsxRuntime: "classic"`, every JSX file imports React. The
   `react/jsx-uses-react` rule tells ESLint that JSX usage counts as a React
   reference, preventing false `no-unused-vars` warnings on the React import.
   If the project later switches to the automatic JSX runtime, this rule can be
   removed and `react/react-in-jsx-scope` can stay off.

## Execution checklist

- [ ] `npm install --save-dev eslint@^9.0.0 @eslint/js eslint-plugin-react eslint-plugin-react-hooks globals`
- [ ] Create `eslint.config.js` with the content above
- [ ] `rm .eslintrc.json`
- [ ] Add `"lint": "eslint src/"` to `package.json` scripts
- [ ] Run `npm run lint` and verify output matches expectations (~70-85 warnings, 0 errors)
- [ ] Decide on `no-console` policy (keep as warn, or allow `console.error`)
