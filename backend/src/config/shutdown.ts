import type { Server } from 'node:http';
import mongoose from 'mongoose';
import type { FrontendHandle } from './frontend';

export function registerGracefulShutdown(
  server: Server,
  getFrontendHandle: () => FrontendHandle | null
): void {
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Library Server] Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      const frontend = getFrontendHandle();
      Promise.allSettled([
        frontend ? frontend.close() : Promise.resolve(),
        mongoose.disconnect(),
      ]).finally(() => process.exit(0));
    });
    server.closeIdleConnections();
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
