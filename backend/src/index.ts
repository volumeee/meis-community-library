import 'dotenv/config';
import http from 'node:http';
import { createApiApp } from './app';
import { createMongoDatabaseManager } from './config/database';
import { attachFrontendMiddleware, type FrontendHandle } from './config/frontend';
import { registerGracefulShutdown } from './config/shutdown';
import { serverErrorHandler } from './middleware/error-handler.middleware';
import { AuthService } from './services/auth';
import { LibraryService } from './services/library.service';

async function startServer(): Promise<void> {
  const dbManager = createMongoDatabaseManager();
  const initialDbState = await dbManager.ensureConnected();

  const service = new LibraryService(dbManager.repository);
  const authService = new AuthService(dbManager.authRepository);
  const app = createApiApp(service, authService, {
    ensureDatabase: dbManager.ensureConnected,
    getDatabaseState: dbManager.getState,
  });

  const server = http.createServer(app);
  const port = Number(process.env.PORT) || 3000;
  const apiOnly = process.env.API_ONLY === 'true';
  let frontend: FrontendHandle | null = null;

  if (!apiOnly) {
    frontend = await attachFrontendMiddleware(app, server);
  }

  app.use(serverErrorHandler);

  server.listen(port, '0.0.0.0', () => {
    console.log(
      `Mei's Community Library server listening on http://0.0.0.0:${port} (storage: mongodb, connected: ${initialDbState.connected})`
    );
  });

  registerGracefulShutdown(server, () => frontend);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
