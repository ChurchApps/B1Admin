import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv only reads .env* files. Deploy scripts pass REACT_APP_STAGE etc.
  // via shell `export`, so merge process.env in (shell wins) — otherwise
  // every non-dev build bakes in undefined and falls through to staging.
  const env = { ...loadEnv(mode, process.cwd(), ['PORT', "REACT_APP"]), ...process.env };
  return {
    plugins: [
      react(),
    ],

    optimizeDeps: {
      // Pre-bundle react-dnd so the lazy-loaded Workflows board route doesn't
      // trigger a mid-session dep re-optimization (which 504s the board chunk).
      include: ['@churchapps/helpers', 'react-dnd', 'react-dnd-html5-backend']
    },

    build: {
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      target: 'es2020'
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: { 'cropperjs/dist/cropper.css': path.resolve(__dirname, 'node_modules/cropperjs/dist/cropper.css') },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.PORT) ?? 3101,
      strictPort: true,
      open: false,
    },
    preview: {
      port: Number(env.PORT) ?? 3101,
      strictPort: true,
      open: true,
    },
    define: {
      // Polyfill process.env.* so CommonEnvironmentHelper (which reads process.env)
      // sees the values in the browser bundle. We expose both REACT_APP_* and
      // NEXT_PUBLIC_* spellings so the same helper works under any framework.
      'process.env.REACT_APP_STAGE': JSON.stringify(env.REACT_APP_STAGE),
      'process.env.REACT_APP_API_BASE': JSON.stringify(env.REACT_APP_API_BASE),
      'process.env.REACT_APP_LESSONS_API': JSON.stringify(env.REACT_APP_LESSONS_API),
      'process.env.REACT_APP_ASK_API': JSON.stringify(env.REACT_APP_ASK_API),
      'process.env.REACT_APP_MESSAGING_API_SOCKET': JSON.stringify(env.REACT_APP_MESSAGING_API_SOCKET),
      'process.env.REACT_APP_GOOGLE_ANALYTICS': JSON.stringify(env.REACT_APP_GOOGLE_ANALYTICS),
      'process.env.REACT_APP_CONTENT_ROOT': JSON.stringify(env.REACT_APP_CONTENT_ROOT),
      'process.env.REACT_APP_B1_ROOT': JSON.stringify(env.REACT_APP_B1_ROOT),
      'process.env.REACT_APP_B1ADMIN_ROOT': JSON.stringify(env.REACT_APP_B1ADMIN_ROOT),
      'process.env.REACT_APP_LESSONS_ROOT': JSON.stringify(env.REACT_APP_LESSONS_ROOT),
      'process.env.NEXT_PUBLIC_STAGE': JSON.stringify(env.REACT_APP_STAGE),
      'process.env.NEXT_PUBLIC_API_BASE': JSON.stringify(env.REACT_APP_API_BASE),
      'process.env.NEXT_PUBLIC_LESSONS_API': JSON.stringify(env.REACT_APP_LESSONS_API),
      'process.env.NEXT_PUBLIC_ASK_API': JSON.stringify(env.REACT_APP_ASK_API),
      'process.env.NEXT_PUBLIC_MESSAGING_API_SOCKET': JSON.stringify(env.REACT_APP_MESSAGING_API_SOCKET),
      'process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS': JSON.stringify(env.REACT_APP_GOOGLE_ANALYTICS),
      'process.env.NEXT_PUBLIC_CONTENT_ROOT': JSON.stringify(env.REACT_APP_CONTENT_ROOT),
      'process.env.NEXT_PUBLIC_B1_ROOT': JSON.stringify(env.REACT_APP_B1_ROOT),
      'process.env.NEXT_PUBLIC_B1ADMIN_ROOT': JSON.stringify(env.REACT_APP_B1ADMIN_ROOT),
      'process.env.NEXT_PUBLIC_LESSONS_ROOT': JSON.stringify(env.REACT_APP_LESSONS_ROOT),
      'process.env.REACT_APP_CHAT_MODE': JSON.stringify(env.REACT_APP_CHAT_MODE),
    },
  } satisfies UserConfig;
});
