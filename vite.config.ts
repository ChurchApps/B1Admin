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

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv doesn't read shell exports; merge process.env so deploy scripts' exports win.
  const env = { ...loadEnv(mode, process.cwd(), ["PORT", "REACT_APP"]), ...process.env };
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      noindexNonProd(env.REACT_APP_STAGE),
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
      "process.env.REACT_APP_CHAT_MODE": JSON.stringify(env.REACT_APP_CHAT_MODE),
      "process.env.REACT_APP_GOCURRICULUM_CLIENT_SECRET": JSON.stringify(env.REACT_APP_GOCURRICULUM_CLIENT_SECRET)
    }
  } satisfies UserConfig;
});
