import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { generatePrismaSchema } from "auth/api";
import { authOptions } from "../src/lib/auth/options.ts";
import { assertSupportedAuthEnvironment } from "../src/lib/env.ts";

// Apply the same fail-closed policy to our schema-tool entry point before any
// adapter/generator initialization or file writes. No runtime credentials needed.
assertSupportedAuthEnvironment(process.env);

// The official pinned generator needs adapter metadata, never a live client.
// Only permit the adapter's optional metadata probe. Any operation still throws,
// so generation cannot accidentally query a DB or require generated client code.
const offlineClient = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "_runtimeDataModel") return undefined;
      throw new Error("Offline schema generation must not access a database.");
    },
  },
);

const result = await generatePrismaSchema({
  options: authOptions,
  adapter: prismaAdapter(offlineClient, {
    provider: "postgresql",
    transaction: true,
  })(authOptions),
  file: resolve("prisma/schema.prisma"),
});

if (result.schemaProblems?.length || result.unsafeChanges?.length) {
  throw new Error(
    "Generated schema needs manual review before it can be written.",
  );
}
if (result.code) await writeFile(result.fileName, result.code);
console.log("Better Auth schema generated offline; no database was contacted.");
