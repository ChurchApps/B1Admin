import { defineConfig, loadEnv, type UserConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "path";


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv doesn't read shell exports; merge process.env so deploy scripts' exports win.
  const env = { ...loadEnv(mode, process.cwd(), ["PORT", "REACT_APP"]), ...process.env };
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] })
    ],

    optimizeDeps: {
      // Pre-bundle react-dnd to prevent mid-session re-optimization on Workflows load.
      include: ["@churchapps/helpers", "react-dnd", "react-dnd-html5-backend"]
    },

    build: {
      chunkSizeWarningLimit: 1000,
      minify: "esbuild"
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
