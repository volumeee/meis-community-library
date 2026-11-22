import mongoose from 'mongoose';
import { MongoAuthRepository, type IAuthRepository } from '../repositories/auth';
import { MongoLibraryRepository, type ILibraryRepository } from '../repositories/library';
import {
  DEFAULT_DB_NAME,
  getMongoConnectOptions,
  isConfiguredMongoUri,
  sanitizeConnectionError,
} from './mongo-uri';

export {
  DEFAULT_DB_NAME,
  getMongoConnectOptions,
  isConfiguredMongoUri,
  sanitizeConnectionError,
};

const RECONNECT_COOLDOWN_MS = 5_000;

let connectionListenersRegistered = false;
let activeErrorReporter: ((message: string) => void) | null = null;

function ensureConnectionEventListeners(): void {
  if (connectionListenersRegistered) return;
  connectionListenersRegistered = true;
  mongoose.connection.on('error', (error: unknown) => {
    const sanitized = sanitizeConnectionError(error);
    console.error(`[Library DB] Connection error: ${sanitized}`);
    activeErrorReporter?.(`MongoDB connection error (${sanitized}).`);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[Library DB] Disconnected from MongoDB.');
    activeErrorReporter?.('Disconnected from MongoDB.');
  });
}

export interface DatabaseState {
  connected: boolean;
  databaseName: string | null;
  lastError: string | null;
}

export interface DatabaseConnectionManager {
  repository: ILibraryRepository;
  authRepository: IAuthRepository;
  ensureConnected(): Promise<DatabaseState>;
  getState(): DatabaseState;
}

export function createMongoDatabaseManager(): DatabaseConnectionManager {
  const repository = new MongoLibraryRepository();
  const authRepository = new MongoAuthRepository();

  let lastError: string | null = null;
  let connectInFlight: Promise<DatabaseState> | null = null;
  let nextRetryAt = 0;

  ensureConnectionEventListeners();
  activeErrorReporter = (message: string) => {
    lastError = message;
  };

  const getState = (): DatabaseState => {
    const connected = mongoose.connection.readyState === 1;
    return {
      connected,
      databaseName: connected ? mongoose.connection.name || DEFAULT_DB_NAME : null,
      lastError: connected ? null : lastError,
    };
  };

  const ensureConnected = async (): Promise<DatabaseState> => {
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) {
      lastError = null;
      nextRetryAt = 0;
      return getState();
    }

    if (connectInFlight) {
      return connectInFlight;
    }

    if (readyState === 2 || readyState === 3) {
      return getState();
    }

    if (Date.now() < nextRetryAt) {
      return getState();
    }

    connectInFlight = (async () => {
      const mongoUri = process.env.MONGODB_URI?.trim();
      if (!isConfiguredMongoUri(mongoUri)) {
        lastError =
          'MONGODB_URI is not configured yet. Add your MongoDB connection string to .env or environment variables.';
        return getState();
      }

      try {
        const options = getMongoConnectOptions(mongoUri, process.env.MONGODB_DB_NAME);
        await mongoose.connect(mongoUri, options);
        lastError = null;
        nextRetryAt = 0;
        const dbName = mongoose.connection.name || options.dbName || DEFAULT_DB_NAME;

        console.log(`[Library DB] Connected to MongoDB (db: ${dbName}).`);
      } catch (error) {
        const sanitized = sanitizeConnectionError(error);
        lastError = `Could not connect to MongoDB Atlas (${sanitized}). Check your MONGODB_URI secret and allowlist the deployment's egress IP address in MongoDB Atlas Network Access.`;
        nextRetryAt = Date.now() + RECONNECT_COOLDOWN_MS;
        console.warn(`[Library DB] ${lastError}`);
      }

      return getState();
    })().finally(() => {
      connectInFlight = null;
    });

    return connectInFlight;
  };

  return {
    repository,
    authRepository,
    ensureConnected,
    getState,
  };
}
