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
      include: ['@churchapps/helpers']
    },

    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor';
            if (id.includes('node_modules/react-router-dom/') || id.includes('node_modules/react-router/')) return 'router';
            if (id.includes('node_modules/@mui/')) return 'mui';
            if (id.includes('node_modules/@churchapps/')) return 'churchapps';
            if (id.includes('node_modules/react-dnd') || id.includes('node_modules/dnd-core')) return 'dnd';
            if (
              id.includes('node_modules/react-cookie') ||
              id.includes('node_modules/axios') ||
              id.includes('node_modules/cropperjs') ||
              id.includes('node_modules/react-cropper')
            ) return 'utilities';
            if (id.includes('/src/people/PeoplePage') || id.includes('/src/people/PersonPage')) return 'people';
            if (id.includes('/src/groups/GroupsPage') || id.includes('/src/groups/GroupPage')) return 'groups';
            if (
              id.includes('/src/donations/DonationsPage') ||
              id.includes('/src/donations/DonationBatchPage') ||
              id.includes('/src/donations/DonationBatchesPage') ||
              id.includes('/src/donations/FundPage') ||
              id.includes('/src/donations/FundsPage')
            ) return 'donations';
            if (id.includes('/src/forms/FormsPage') || id.includes('/src/forms/FormPage')) return 'forms';
            if (
              id.includes('/src/serving/ServingPage') ||
              id.includes('/src/serving/plans/PlanPage') ||
              id.includes('/src/serving/planTypes/PlanTypePage')
            ) return 'serving';
            if (id.includes('/src/serving/songs/SongsPage') || id.includes('/src/serving/songs/SongPage')) return 'songs';
            if (
              id.includes('/src/serving/tasks/TasksPage') ||
              id.includes('/src/serving/tasks/TaskPage') ||
              id.includes('/src/serving/tasks/automations/AutomationsPage')
            ) return 'tasks';
            if (id.includes('/src/serverAdmin/AdminPage') || id.includes('/src/serverAdmin/ReportPage')) return 'admin';
            if (id.includes('/src/reports/ReportsPage') || id.includes('/src/reports/ReportPage')) return 'reports';
          }
        },
        maxParallelFileOps: 2
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      target: 'es2020'
    },
    resolve: { alias: { 'cropperjs/dist/cropper.css': path.resolve(__dirname, 'node_modules/cropperjs/dist/cropper.css') } },
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
