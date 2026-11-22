import type { Server } from 'node:http';
import path from 'node:path';
import express, { type Express } from 'express';

export interface FrontendHandle {
  close(): Promise<void>;
}

export async function attachFrontendMiddleware(
  app: Express,
  server: Server
): Promise<FrontendHandle | null> {
  if (process.env.NODE_ENV !== 'production') {
    // Dev-only: vite is omitted from production dependencies (npm ci --omit=dev)
    const { createServer: createViteServer } = await import('vite');
    const viteServer = await createViteServer({
      configFile: path.resolve(process.cwd(), 'frontend', 'vite.config.ts'),
      server: { middlewareMode: true, hmr: { server } },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
    return viteServer;
  }

  const distDir = path.resolve(process.cwd(), 'frontend', 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res, next) => {
    res.sendFile(path.join(distDir, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
  return null;
}
