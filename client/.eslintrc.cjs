module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: [
    "dist",
    ".tsc-out",
    ".eslintrc.cjs",
    "vite.config.ts",
    "vitest.config.ts",
    // Defense-in-depth: tsc -b for the node-side config previously had no
    // outDir and emitted these directly into the project root (now fixed
    // via tsconfig.node.json's outDir) — ignored here too in case a stale
    // checkout or a manual `tsc -b` run regenerates them before that fix
    // is picked up.
    "vite.config.js",
    "vite.config.d.ts",
    "vitest.config.js",
    "vitest.config.d.ts",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  },
};
