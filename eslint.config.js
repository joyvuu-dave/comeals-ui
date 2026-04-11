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
      ecmaVersion: 2022,
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
      "no-console": ["warn", { allow: ["error", "warn"] }],

      // --- React rules (conservative) ---
      "react/jsx-uses-react": "off", // Not needed with automatic JSX runtime
      "react/jsx-uses-vars": "error",
      "react/no-direct-mutation-state": "error",
      "react/no-deprecated": "warn",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-key": "warn",
      "react/no-unknown-property": "error",

      // Disable rules that would cause mass noise in this codebase
      "react/prop-types": "off", // No PropTypes used anywhere
      "react/display-name": "off", // MobX inject/observer wrappers lose display names
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
    files: ["server.js", "playwright.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off", // Console is expected in server/tooling code
    },
  },

  // -----------------------------------------------------------
  // vite.config.js -- Node ESM (uses import/export)
  // -----------------------------------------------------------
  {
    files: ["vite.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
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
  // E2E test files -- Node CommonJS (Playwright)
  // -----------------------------------------------------------
  {
    files: ["tests/e2e/**/*.js", "tests/helpers/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        window: "readonly", // used inside page.addInitScript() browser callbacks
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },

  // -----------------------------------------------------------
  // Unit test files -- Node ESM (Vitest)
  // -----------------------------------------------------------
  {
    files: ["tests/unit/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        window: "writable", // Vitest runs with jsdom environment
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },

  // -----------------------------------------------------------
  // Ignore build output, dependencies, and this config file
  // -----------------------------------------------------------
  {
    ignores: ["build/**", "node_modules/**", "eslint.config.js"],
  },
];
