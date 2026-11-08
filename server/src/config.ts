import "dotenv/config";

const SUPPORTED_ENVIRONMENTS = ["development", "test", "production"] as const;
type NodeEnvironment = (typeof SUPPORTED_ENVIRONMENTS)[number];

function readOptional(name: string, fallback: string): string {
  const value = process.env[name];
  return value !== undefined && value.trim() !== "" ? value.trim() : fallback;
}

function readRequired(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy server/.env.example to server/.env and set it before starting the server.`
    );
  }
  return value.trim();
}

function readPort(name: string, fallback: string): number {
  const raw = readOptional(name, fallback);
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name} "${raw}". It must be an integer between 1 and 65535.`);
  }
  return port;
}

function readNodeEnvironment(): NodeEnvironment {
  const raw = readOptional("NODE_ENV", "development");
  if (!SUPPORTED_ENVIRONMENTS.includes(raw as NodeEnvironment)) {
    throw new Error(
      `Invalid NODE_ENV "${raw}". Expected one of: ${SUPPORTED_ENVIRONMENTS.join(", ")}.`
    );
  }
  return raw as NodeEnvironment;
}

function readDatabaseUrl(): string {
  const url = readRequired("DATABASE_URL");
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error(
      `Invalid DATABASE_URL "${url}". Expected a PostgreSQL connection string starting with postgres:// or postgresql://.`
    );
  }
  return url;
}

function readSessionSecret(): string {
  const secret = readRequired("SESSION_SECRET");
  if (secret.length < 16) {
    throw new Error(
      "Invalid SESSION_SECRET. It must be at least 16 characters long; generate one with `openssl rand -hex 32`."
    );
  }
  return secret;
}

const nodeEnv = readNodeEnvironment();

export const config = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === "production",
  isTest: nodeEnv === "test",
  port: readPort("PORT", "4000"),
  databaseUrl: readDatabaseUrl(),
  sessionSecret: readSessionSecret(),
  clientOrigin: readOptional("CLIENT_ORIGIN", "http://localhost:5173"),
});
