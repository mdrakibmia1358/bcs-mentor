import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { readMigrationEnvironment } from "./src/lib/env";

config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Generate/validate/schema-to-SQL diff work offline without a connection.
    // Connection commands fail without DIRECT_URL; there is no runtime fallback.
    url: process.env.DIRECT_URL
      ? readMigrationEnvironment(process.env).DIRECT_URL
      : undefined,
  },
});
