import type { ConnectOptions } from 'mongoose';

export const DEFAULT_DB_NAME = 'meis_community_library';

export function isConfiguredMongoUri(uri: string | undefined): uri is string {
  if (!uri) return false;
  const trimmed = uri.trim();
  if (!trimmed) return false;
  if (
    trimmed.includes('MY_MONGODB_URI') ||
    trimmed.includes('<db_username>') ||
    trimmed.includes('<db_password>') ||
    trimmed.includes('<password>') ||
    trimmed.includes('<cluster-host>')
  ) {
    return false;
  }
  return trimmed.startsWith('mongodb://') || trimmed.startsWith('mongodb+srv://');
}

export function getMongoConnectOptions(
  mongoUri: string,
  envDbName?: string
): ConnectOptions {
  const options: ConnectOptions = {
    serverSelectionTimeoutMS: 8000,
  };

  const uriPath = /^mongodb(?:\+srv)?:\/\/[^/?]+(?:\/([^?]*))?/i.exec(mongoUri)?.[1];
  const uriHasDbName = Boolean(uriPath?.replace(/^\/+/, '').trim());

  if (!uriHasDbName) {
    options.dbName = envDbName?.trim() || DEFAULT_DB_NAME;
  }

  return options;
}

export function sanitizeConnectionError(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Unknown error';
  return raw.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, '[redacted-mongodb-uri]');
}
