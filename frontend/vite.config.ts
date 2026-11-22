import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  const frontendDir = import.meta.dirname;
  let resolvedOutDir = path.resolve(frontendDir, 'dist');

  return {
    root: frontendDir,
    plugins: [
      react(),
      tailwindcss(),
      // Copies frontend/src/assets into frontend/dist/src/assets so root-relative
      // cover URLs like "/src/assets/images/..." resolve in production builds.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        configResolved(config): void {
          resolvedOutDir = path.resolve(config.root, config.build.outDir);
        },
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const srcAssets = path.resolve(frontendDir, 'src/assets');
          const distAssets = path.resolve(resolvedOutDir, 'src/assets');
          if (fs.existsSync(resolvedOutDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, { recursive: true, force: true });
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@shared': path.resolve(frontendDir, '../shared'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'motion/react'],
    },
    preview: {
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${process.env.PORT || 3000}`,
        },
      },
    },
  };
});
