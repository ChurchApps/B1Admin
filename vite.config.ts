import { defineConfig, loadEnv, type Plugin, type UserConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import fs from "fs";
import path from "path";

// demo.b1.church is this app (s3://demo-chums-app). Do not noindex prod (admin.b1.church / s3://chums-app).
function noindexNonProd(stage: string | undefined): Plugin {
  const noindexMeta = stage === "demo" || stage === "staging";
  const disallowAll = stage === "demo";
  return {
    name: "noindex-nonprod",
    transformIndexHtml(html) {
      if (!noindexMeta || html.includes('name="robots"')) return html;
      return html.replace("<head>", '<head>\n    <meta name="robots" content="noindex, nofollow" />');
    },
    closeBundle() {
      if (!disallowAll) return;
      fs.writeFileSync(path.resolve("dist/robots.txt"), "User-agent: *\nDisallow: /\n");
    }
  };
}

// The self-host image serves the app under /admin. Vite rewrites imports and index.html for `base`,
// but not root-relative public paths inside runtime strings, so patch those in the emitted chunks.
function selfHostBase(base: string): Plugin | false {
  if (base === "/") return false;
  const re = /(["'`])\/(images|locales|apphelper)\//g;
  return {
    name: "selfhost-base",
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) if (file.type === "chunk") file.code = file.code.replace(re, `$1${base}$2/`);
    }
  };
}

// The Playwright suite runs against `PW_TEST_BUILD=1 vite build` (package.json build:test): the production bundle,
// served statically, plus two test-only differences. MUI's createSvgIcon sets data-testid="<Name>Icon" only
// outside production and 15 selectors in 6 specs rely on it, so the expression is kept as-is in that build (a
// development-mode bundle would also keep it, but renders about 40% slower: 28.6 min vs 20.6 min for the suite).
function muiIconTestIds(enabled: boolean): Plugin | false {
  if (!enabled) return false;
  return {
    name: "mui-icon-testids",
    enforce: "pre",
    transform(code, id) {
      if (!/@mui\/material\/.*createSvgIcon\.js$/.test(id) || !code.includes("data-testid")) return null;
      const out = code.replace(/process\.env\.NODE_ENV !== ['"]production['"] \? (`\$\{displayName\}Icon`) : undefined/, "$1");
      if (out === code) this.error("mui-icon-testids: createSvgIcon no longer matches; update the transform or the icon selectors in tests/");
      return { code: out, map: null };
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const testBuild = !!process.env.PW_TEST_BUILD;
  // loadEnv doesn't read shell exports; merge process.env so deploy scripts' exports win.
  const env = { ...loadEnv(mode, process.cwd(), ["PORT", "REACT_APP", "VITE_BASE_PATH"]), ...process.env };
  const base = env.VITE_BASE_PATH || "/";
  return {
    base,
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      noindexNonProd(env.REACT_APP_STAGE),
      selfHostBase(base),
      muiIconTestIds(testBuild),
      // Uploads sourcemaps so Sentry stack traces aren't minified; no-op without the token.
      !!env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
        org: "churchapps",
        project: "b1-admin",
        authToken: env.SENTRY_AUTH_TOKEN,
        sourcemaps: { filesToDeleteAfterUpload: "dist/**/*.map" }
      })
    ],

    optimizeDeps: {
      // Pre-bundle react-dnd to prevent mid-session re-optimization on Workflows load.
      include: ["@churchapps/helpers", "react-dnd", "react-dnd-html5-backend"]
    },

    build: {
      // The test fixture pages under tests/fixtures (plain Vite entry points) are only built into the test bundle.
      rollupOptions: testBuild
        ? { input: { main: path.resolve(__dirname, "index.html"), assignmentConfirmationPreview: path.resolve(__dirname, "tests/fixtures/assignment-confirmation/index.html") } }
        : undefined,
      chunkSizeWarningLimit: 1000,
      minify: "esbuild",
      // "hidden": maps generated for Sentry upload but not referenced from the bundles (and deleted after upload).
      sourcemap: env.SENTRY_AUTH_TOKEN ? ("hidden" as const) : false
    },
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: { "cropperjs/dist/cropper.css": path.resolve(__dirname, "node_modules/cropperjs/dist/cropper.css") }
    },
    server: {
      host: "0.0.0.0",
      port: Number(env.PORT) ?? 3101,
      strictPort: true,
      open: false
    },
    preview: {
      port: Number(env.PORT) ?? 3101,
      strictPort: true,
      open: true
    },
    define: {
      // Expose both REACT_APP_* and NEXT_PUBLIC_* so CommonEnvironmentHelper works cross-framework.
      "process.env.REACT_APP_STAGE": JSON.stringify(env.REACT_APP_STAGE),
      "process.env.REACT_APP_API_BASE": JSON.stringify(env.REACT_APP_API_BASE),
      "process.env.REACT_APP_LESSONS_API": JSON.stringify(env.REACT_APP_LESSONS_API),
      "process.env.REACT_APP_ASK_API": JSON.stringify(env.REACT_APP_ASK_API),
      "process.env.REACT_APP_MESSAGING_API_SOCKET": JSON.stringify(env.REACT_APP_MESSAGING_API_SOCKET),
      "process.env.REACT_APP_GOOGLE_ANALYTICS": JSON.stringify(env.REACT_APP_GOOGLE_ANALYTICS),
      "process.env.REACT_APP_CONTENT_ROOT": JSON.stringify(env.REACT_APP_CONTENT_ROOT),
      "process.env.REACT_APP_B1_ROOT": JSON.stringify(env.REACT_APP_B1_ROOT),
      "process.env.REACT_APP_B1ADMIN_ROOT": JSON.stringify(env.REACT_APP_B1ADMIN_ROOT),
      "process.env.REACT_APP_LESSONS_ROOT": JSON.stringify(env.REACT_APP_LESSONS_ROOT),
      "process.env.NEXT_PUBLIC_STAGE": JSON.stringify(env.REACT_APP_STAGE),
      "process.env.NEXT_PUBLIC_API_BASE": JSON.stringify(env.REACT_APP_API_BASE),
      "process.env.NEXT_PUBLIC_LESSONS_API": JSON.stringify(env.REACT_APP_LESSONS_API),
      "process.env.NEXT_PUBLIC_ASK_API": JSON.stringify(env.REACT_APP_ASK_API),
      "process.env.NEXT_PUBLIC_MESSAGING_API_SOCKET": JSON.stringify(env.REACT_APP_MESSAGING_API_SOCKET),
      "process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS": JSON.stringify(env.REACT_APP_GOOGLE_ANALYTICS),
      "process.env.NEXT_PUBLIC_CONTENT_ROOT": JSON.stringify(env.REACT_APP_CONTENT_ROOT),
      "process.env.NEXT_PUBLIC_B1_ROOT": JSON.stringify(env.REACT_APP_B1_ROOT),
      "process.env.NEXT_PUBLIC_B1ADMIN_ROOT": JSON.stringify(env.REACT_APP_B1ADMIN_ROOT),
      "process.env.NEXT_PUBLIC_LESSONS_ROOT": JSON.stringify(env.REACT_APP_LESSONS_ROOT),
      "process.env.REACT_APP_CHAT_MODE": JSON.stringify(env.REACT_APP_CHAT_MODE)
    }
  } satisfies UserConfig;
});
