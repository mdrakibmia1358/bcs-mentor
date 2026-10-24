import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getRuntimeEnvironment } from "./env.server";

const databaseGlobal = globalThis as typeof globalThis & {
  bcsMentorPrisma?: PrismaClient;
};

let client: PrismaClient | undefined;

export function getPrisma() {
  if (client) return client;

  const environment = getRuntimeEnvironment();
  client = databaseGlobal.bcsMentorPrisma;

  if (!client) {
    const adapter = new PrismaPg({
      connectionString: environment.DATABASE_URL,
      enableChannelBinding: true,
      max: 5,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
    client = new PrismaClient({ adapter, errorFormat: "minimal", log: [] });
  }

  if (environment.NODE_ENV !== "production")
    databaseGlobal.bcsMentorPrisma = client;
  return client;
}
