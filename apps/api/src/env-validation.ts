export interface ApiEnv {
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  port: number;
  isProd: boolean;
  guestDocumentEncryptionKey: string;
}

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

/** Parse and validate settings before Nest starts listening. */
export function parseApiEnv(source: NodeJS.ProcessEnv): ApiEnv {
  const databaseUrl = required(source, 'DATABASE_URL');
  let parsedDatabaseUrl: URL;
  try {
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL must use the postgres or postgresql protocol');
  }

  const jwtSecret = required(source, 'JWT_SECRET');
  const isProd = source.NODE_ENV === 'production';
  if (isProd && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production');
  }

  const port = Number(source.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    databaseUrl,
    jwtSecret,
    jwtExpiresIn: source.JWT_EXPIRES_IN?.trim() || '8h',
    port,
    isProd,
    guestDocumentEncryptionKey: source.GUEST_DOCUMENT_ENCRYPTION_KEY ?? '',
  };
}
