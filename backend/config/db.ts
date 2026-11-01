import mongoose from 'mongoose';
import { readEnvValue } from '../env.ts';

let isConnected = false;
let lastError: string | null = null;
let resolvedHost: string | null = null;
let resolvedDbName: string | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

type MongoReadyListener = () => void | Promise<void>;
const mongoReadyListeners: MongoReadyListener[] = [];

// Allows the in-memory stores to hydrate and flush queued writes every time
// MongoDB becomes available (initial connect *and* later retries/reconnects).
export function onMongoReady(listener: MongoReadyListener): void {
  mongoReadyListeners.push(listener);
}

async function notifyMongoReady(): Promise<void> {
  for (const listener of mongoReadyListeners) {
    try {
      await listener();
    } catch (error) {
      console.error('[MongoDB] Ready handler failed:', error);
    }
  }
}

function maskMongoHost(uri: string): string {
  try {
    const withoutProtocol = uri.replace(/^mongodb(\+srv)?:\/\//, '');
    const afterAuth = withoutProtocol.includes('@')
      ? withoutProtocol.split('@').slice(1).join('@')
      : withoutProtocol;
    const host = afterAuth.split('/')[0].split('?')[0];
    const hosts = host.split(',').map(part => part.split(':')[0]);
    return hosts.join(',');
  } catch {
    return 'unknown-host';
  }
}

// MongoDB driver rejects unknown URI query options (for example `?fill=fillups`),
// which silently pushed the app into in-memory mode. Keep only supported options.
const SUPPORTED_MONGO_OPTIONS = new Set([
  'appname', 'authsource', 'authmechanism', 'authmechanismproperties', 'replicaset',
  'tls', 'ssl', 'tlsallowinvalidcertificates', 'tlsallowinvalidhostnames', 'tlscafile',
  'tlscertificatekeyfile', 'tlscertificatekeyfilepassword', 'tlsdisableocspendpointcheck',
  'readpreference', 'readpreferencetags', 'maxpoolsize', 'minpoolsize', 'maxidletimems',
  'maxstalenessseconds', 'connecttimeoutms', 'sockettimeoutms', 'serverselectiontimeoutms',
  'wtimeoutms', 'journal', 'w', 'retrywrites', 'retryreads', 'directconnection',
  'loadbalanced', 'srvmaxhosts', 'srvservicename', 'zlibcompressionlevel', 'compressors',
  'heartbeatfrequencyms', 'localthresholdms', 'waitqueuetimeoutms', 'family', 'hint',
  'monitorcommands', 'proxyhost', 'proxyport', 'proxyusername', 'proxypassword',
  'nodelay', 'keepalive', 'keepaliveinitialdelay'
]);

function sanitizeMongoUri(rawUri: string): { uri: string; droppedOptions: string[]; dbNameHint?: string } {
  const [base, rawQuery] = rawUri.split('?');
  if (!rawQuery) return { uri: rawUri, droppedOptions: [] };

  const params = new URLSearchParams(rawQuery);
  const droppedOptions: string[] = [];
  let dbNameHint: string | undefined;

  for (const key of [...params.keys()]) {
    const lower = key.toLowerCase();
    if (lower === 'fill') {
      // Legacy typo in the deployed URI: `?fill=fillups` was meant as the DB name.
      dbNameHint = params.get(key) || undefined;
      params.delete(key);
      droppedOptions.push(key);
      continue;
    }
    if (!SUPPORTED_MONGO_OPTIONS.has(lower)) {
      params.delete(key);
      droppedOptions.push(key);
    }
  }

  const query = params.toString();
  return { uri: query ? `${base}?${query}` : base, droppedOptions, dbNameHint };
}

export async function connectDB(): Promise<void> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  // Support common names so a Render env var can be added without code changes.
  const rawMongoUri =
    readEnvValue('MONGODB_URI') ||
    readEnvValue('MONGODB_URL') ||
    readEnvValue('MONGO_URL') ||
    readEnvValue('DATABASE_URL');

  if (!rawMongoUri) {
    console.warn('[MongoDB] MONGODB_URI is not set. Running in in-memory mode (data will be lost on restart).');
    console.warn('[MongoDB] Add MONGODB_URI in Render → Environment (or backend/.env) to persist data to MongoDB Atlas.');
    return;
  }

  const { uri: mongoUri, droppedOptions, dbNameHint } = sanitizeMongoUri(rawMongoUri);
  if (droppedOptions.length) {
    console.warn(`[MongoDB] Removed unsupported URI option(s): ${droppedOptions.join(', ')}`);
  }

  const dbName = readEnvValue('MONGODB_DB_NAME') || dbNameHint || 'fillups';
  resolvedHost = maskMongoHost(mongoUri);
  resolvedDbName = dbName;

  try {
    mongoose.set('strictQuery', false);
    mongoose.set('bufferCommands', true);
    await mongoose.connect(mongoUri, {
      dbName,
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      retryWrites: true
    });
    isConnected = true;
    lastError = null;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    console.log(`[MongoDB] Connected to Atlas host: ${maskMongoHost(mongoUri)} (db: ${dbName})`);
    await notifyMongoReady();
  } catch (error) {
    isConnected = false;
    lastError = error instanceof Error ? error.message : String(error);
    console.error('[MongoDB] Connection failed:', lastError);
    console.error('[MongoDB] Check: (1) MONGODB_URI value on Render, (2) Atlas Network Access allowlist includes 0.0.0.0/0, (3) database user password.');
    console.warn('[MongoDB] Falling back to in-memory mode; will retry in 30s.');
    if (!retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        void connectDB();
      }, 30_000);
    }
  }
}

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Disconnected. Data changes will be queued/in-memory until reconnect.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  lastError = null;
  console.log('[MongoDB] Reconnected.');
  void notifyMongoReady();
});

mongoose.connection.on('error', (error) => {
  lastError = error instanceof Error ? error.message : String(error);
  console.error('[MongoDB] Connection error:', lastError);
});

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export function getMongoStatus(): {
  connected: boolean;
  lastError: string | null;
  configured: boolean;
  host: string | null;
  dbName: string | null;
  readyState: number;
} {
  return {
    connected: isMongoConnected(),
    lastError,
    configured: Boolean(
      readEnvValue('MONGODB_URI') ||
      readEnvValue('MONGODB_URL') ||
      readEnvValue('MONGO_URL') ||
      readEnvValue('DATABASE_URL')
    ),
    host: resolvedHost,
    dbName: resolvedDbName,
    readyState: mongoose.connection.readyState
  };
}
