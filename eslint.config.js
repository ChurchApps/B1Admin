import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import unusedImports from "eslint-plugin-unused-imports";

export default [
  { ignores: ["node_modules/", "dist/", "build/", ".next/", "coverage/", "*.config.js"] },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "unused-imports": unusedImports,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs.recommended.reduce((acc, cfg) => ({ ...acc, ...(cfg.rules || {}) }), {}),

      // --- Code quality ---
      "prefer-const": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        args: "all",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "unused-imports/no-unused-imports": "error",
      "no-case-declarations": "off",
      "no-constant-binary-expression": "off",

      // --- Formatting (ESLint is the sole formatter — no Prettier) ---
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],
      "quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],
      "semi": ["error", "always"],
      "comma-dangle": ["error", "never"],
      "indent": ["warn", 2, { SwitchCase: 1 }],
      "comma-spacing": ["error", { before: false, after: true }],
      "key-spacing": ["error", { beforeColon: false, afterColon: true, mode: "strict" }],
      "keyword-spacing": ["error", { before: true, after: true }],
      "space-infix-ops": "error",
      "no-multi-spaces": ["error", { ignoreEOLComments: true }],
      "block-spacing": ["error", "always"],

      // --- Compact / single-line formatting ---
      "brace-style": ["error", "1tbs", { allowSingleLine: true }],
      curly: ["error", "multi-line"],
      "nonblock-statement-body-position": ["error", "beside"],

      // Objects
      "object-curly-spacing": ["error", "always"],
      "object-curly-newline": ["error", {
        ObjectExpression: { multiline: true },
        ObjectPattern: { multiline: true },
        ImportDeclaration: { multiline: true },
        ExportDeclaration: { multiline: true }
      }],
      "object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],

      // Arrays
      "array-bracket-spacing": ["error", "never"],
      "array-bracket-newline": ["error", { multiline: true, minItems: 8 }],
      "array-element-newline": ["error", { ArrayExpression: "consistent", ArrayPattern: { minItems: 8 } }],

      // Functions
      "function-paren-newline": ["error", "consistent"],
      "function-call-argument-newline": ["error", "consistent"],

      // Line length
      "max-len": ["warn", {
        code: 250,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreRegExpLiterals: true
      }],

      // React hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",
    },
  },
];
