# Milestone 03 Phase A review packet

Prepared on **24 October 2026**, Asia/Dhaka, for the conditions in [GitHub Issue #2](https://github.com/mdrakibmia1358/bcs-mentor/issues/2). This phase adds the authentication and database foundation on `feat/auth-foundation`, based on `main` at `52413831a3e0786f21f1e739f70f8973dfa55038`.

The landing page and `/dashboard` remain public demonstrations. There is no mounted authentication handler, auth UI, email provider, AI integration, or learner persistence. Public signup is disabled in code. The SQL below is prepared for review only: no migrations or other database commands have been executed against a database. No commit, push, merge, deployment, or production enablement belongs to this phase.

## Package compatibility and security review

Direct foundation dependencies and the generation tool use exact versions:

| Package                               | Pin      | Compatibility checked                                                                          |
| ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `better-auth`                         | `1.7.12` | Supports Prisma 7, Next 16, React 19, and pg 8 through declared optional peer ranges           |
| `@better-auth/prisma-adapter`         | `1.7.12` | Supports Prisma and client `^5.0.0 \|\| ^6.0.0 \|\| ^7.0.0`; matching Better Auth core release |
| `auth` (development schema generator) | `1.7.12` | Node `>=22.12.0`; exposes the official `auth/api` generator entry point                        |
| `prisma` / `@prisma/client`           | `7.10.1` | Node `^20.19 \|\| ^22.12 \|\| >=24.0`; TypeScript `>=5.4.0`                                    |
| `@prisma/adapter-pg`                  | `7.10.1` | Its pg dependency range is `^8.16.3`, satisfied by the project pin                             |
| `pg`                                  | `8.23.1` | Node `>=16`; no native pg peer is needed                                                       |
| `dotenv`                              | `18.0.9` | Explicit environment loading for Prisma CLI                                                    |
| `zod`                                 | `4.6.7`  | Server configuration validation                                                                |
| `server-only`                         | `0.0.1`  | Guards runtime environment, database, and auth modules                                         |

Existing framework pins are Next and `eslint-config-next` **16.4.3**, React and React DOM **19.3.1**. The security correction selects Node **22.23.4** in `.nvmrc`; package engines require `^22.23.4 || ^24.22.1` and npm `>=10.0.0`. These Node ranges require the October 21, 2026 security patches in each supported LTS line. The installed TypeScript **5.9.3** satisfies Prisma's floor. Package metadata and the lockfile were inspected alongside the official sources below. Runtime execution evidence is recorded separately from the configured minimum.

- The official [Node 22.23.4](https://nodejs.org/en/blog/release/v22.23.4) and [Node 24.22.1](https://nodejs.org/en/blog/release/v24.22.1) releases provide the October 21 security floors. The original Node 22.21.1 pin predated these fixes. Earlier passing application checks do not waive the runtime patch requirement; fresh correction verification must identify the binary actually used.
- [Better Auth's Prisma guide](https://better-auth.com/docs/adapters/prisma) explicitly covers Prisma 7 with PostgreSQL and its driver adapter. [Prisma's v7 upgrade guide](https://docs.prisma.io/docs/orm/v6/more/upgrades/to-v7) documents ESM, the explicit client output path, driver adapters, the environment-loading change, and CLI URL configuration.
- [Better Auth 1.7.12 release notes](https://github.com/better-auth/better-auth/releases/tag/v1.7.12), dated October 20, include stored-key algorithm validation for JWTs, OAuth callback issuer/nonce checks, and stricter ID token validation. This project enables no OAuth, Magic Link, JWT, or SSO plugin.
- The [OAuth-state/Magic Link takeover advisory](https://github.com/better-auth/better-auth/security/advisories/GHSA-965c-763c-88jm) and [OAuth proxy takeover advisory](https://github.com/better-auth/better-auth/security/advisories/GHSA-r4xp-prcw-77qf) were fixed in **1.7.7**. The project is above those patch levels and enables neither affected flow. The [PostgreSQL rate-limit concurrency advisory](https://github.com/better-auth/better-auth/security/advisories/GHSA-44jh-23m7-hpcf) concerns the affected Drizzle/Kysely adapter versions; the selected adapter is Prisma 1.7.12.
- [Prisma 7.10.1 release notes](https://github.com/prisma/orm/releases/tag/7.10.1), dated October 19, describe a fix for nested transaction options contaminating later transactions, refusal of a shadow database targeting the main database, and dependency security updates. [Prisma's release-status guidance](https://www.prisma.io/docs/orm/release-status) warns that the current `latest` CLI is Prisma 8 RC. The project keeps the v7 CLI pinned and invokes the installed CLI through npm scripts.
- [Next's October 14 security update](https://nextjs.org/blog/nextjs-security-update-october-14-2026) identifies **16.4.1** as the fixed 16.x version and **sharp 0.35.5** as the fixed image-processing threshold. Next **16.4.3** exceeds that floor, and the lockfile resolves sharp **0.35.5**. React's October [RSC RCE advisory](https://github.com/react/react/security/advisories/GHSA-xqc2-xf4c-x3h3) and [Server Function DoS advisory](https://github.com/react/react/security/advisories/GHSA-h3gv-c5rc-p453) list **19.3.1** as patched. Framework fixes are delivered through the pinned Next release as well as the matching React packages.
- The [pg repository advisory index](https://github.com/brianc/node-postgres/security/advisories) currently has no published advisories. This observation is limited to that index; the final dependency audit result is recorded below. [pg TLS guidance](https://node-postgres.com/features/ssl) warns that SSL parameters in a connection string replace an explicit `ssl` object. The implementation uses the validated URL and retains certificate verification.

## Environment contract

Only these four application variables are documented, plus Node's standard `NODE_ENV`. No values from a real environment belong in this packet, the example file, logs, or client bundles.

| Variable             | Purpose and validation                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`       | Pooled PostgreSQL runtime URL passed only to `PrismaPg`. A Neon URL must contain `-pooler.` in its hostname. It is not used as a fallback migration URL.                                                                   |
| `DIRECT_URL`         | Unpooled PostgreSQL URL for Prisma CLI connection commands, read only by `prisma.config.ts`. A hostname containing `-pooler.` is rejected. Runtime auth does not require or read it.                                       |
| `BETTER_AUTH_SECRET` | Required when runtime auth is initialized: at least 32 characters and at least 10 distinct characters. There is no default secret or hardcoded development secret.                                                         |
| `BETTER_AUTH_URL`    | Explicit application origin, used for the base URL and sole trusted origin. Credentials, paths, query strings, and fragments are rejected. HTTP is accepted only for loopback in nonproduction; production requires HTTPS. |
| `NODE_ENV`           | `development`, `test`, or `production`; defaults to `development` when omitted. Controls production TLS and secure-cookie requirements.                                                                                    |

[`.env.example`](../.env.example) contains blank database and secret fields and a loopback application origin. It supplies no usable credentials and cannot enable a public authentication flow. There is no signup environment toggle and no email-provider credential in Phase A.

Both database URL parsers accept only `postgres:` or `postgresql:`, require a host and database name, and reject fragments. Hostnames are lowercased, a trailing dot is removed, and percent-encoded hostnames are rejected before hostname policy is checked. Their supported query parameters are exactly `sslmode`, `channel_binding`, `application_name`, and `connect_timeout`; unsupported or duplicate parameters are rejected to prevent connection overrides. Remote URLs require `sslmode=verify-full`, which verifies the certificate and hostname. Runtime production validation also requires `verify-full` for loopback URLs. There is no certificate-verification bypass. The migration parser permits a local loopback URL without TLS for future approved nonproduction work.

The runtime environment is read lazily by a `server-only` module. Validation errors identify the invalid variable names and hide their values; they do not attach the raw validator error or a connection URL as a cause. The Prisma config explicitly loads `.env` through dotenv, without overriding the process environment. It leaves the CLI datasource undefined when `DIRECT_URL` is absent, which permits generation, validation, and empty-to-schema SQL diffing without a database. Connection commands have no runtime URL fallback.

`BETTER_AUTH_SECRETS`, `BETTER_AUTH_TRUSTED_ORIGINS`, `BETTER_AUTH_TELEMETRY`, `BETTER_AUTH_TELEMETRY_ENDPOINT`, and `BETTER_AUTH_TELEMETRY_DEBUG` are explicitly unsupported, rather than additional configuration inputs. Any definition, including an empty string or `false`, is rejected before Better Auth initialization. The shared runtime validator enforces this contract, and `getAuth()` rechecks it before returning even a cached instance, covering configuration first cached by a database accessor. The supported `npm run auth:schema` script applies the same guard before adapter/generator initialization or file writes. Errors identify only rejected variable names and hide values; no raw dependency parsing error or cause is attached. The implementation neither mutates nor deletes environment values. Phase A adds no secret rotation, extra trusted origins, telemetry activation, or public-prefixed secret source. Offline schema generation still requires no runtime credentials.

## Auth and database behavior prepared for review

[`src/lib/db.server.ts`](../src/lib/db.server.ts) creates one lazy Prisma client with a `PrismaPg` adapter, pool maximum **5**, connection timeout **10 seconds**, and idle timeout **30 seconds**. `enableChannelBinding: true` enables channel binding opportunistically when the server supports it; this is not a claim of required channel-binding enforcement. A development global caches the client across hot reloads. Prisma logs are disabled, and errors use the minimal format. Generated client code lives in ignored `src/generated/prisma`; source checks ignore generated code.

[`src/lib/auth/server.ts`](../src/lib/auth/server.ts) is server-only and exposes lazy `getAuth()`. It shares policy with [`src/lib/auth/options.ts`](../src/lib/auth/options.ts), supplies the validated origin and secret, enables the Prisma adapter's `transaction: true`, and applies secure cookies for HTTPS or production. Neither public route invokes these accessors. The configured base path is `/api/auth`, but no route handler exposes it in Phase A.

The policy requires verified email for password sign-in and disables signup with a literal `disableSignUp: true`; enabling it requires a reviewed code change. Passwords are **12–128** characters, Better Auth's default scrypt hashing is retained, automatic sign-in after signup and verification is disabled, and reset links have a **30-minute** lifetime. Verification links expire after **one hour**. Account linking, email changes, account deletion, cross-subdomain cookies, and trusted proxy host/protocol headers are disabled. Origin and CSRF checks remain enabled, the trusted origin is exact, and cookie attributes retain HttpOnly and SameSite=Lax. These decisions follow the [official security guidance](https://better-auth.com/docs/reference/security) and [options reference](https://better-auth.com/docs/reference/options).

Email callbacks throw a generic service-unavailable response and do not log addresses, tokens, or links. A before hook rejects password-reset requests and verification-email requests uniformly before account lookup, including direct server API calls. Delivery never silently pretends to succeed. Real delivery and recovery must be implemented and tested in a later reviewed phase before public signup can be considered.

Sessions are stored in the database, expire after **seven days**, have refresh disabled, and have no session cookie cache or secondary storage. `revokeSessionsOnPasswordReset: true` requests revocation of every user session. Inspection of the pinned library's `resetCredentialPassword` implementation confirms that consuming the reset token, deleting database sessions, and writing the password run inside the same adapter transaction. The Prisma adapter is configured to support that transaction. This is source-level verification; rollback and session invalidation have not been exercised against a live database. See [Better Auth's password-reset guidance](https://better-auth.com/docs/authentication/email-password) and the [pinned reset implementation](https://github.com/better-auth/better-auth/blob/v1.7.12/packages/better-auth/src/utils/password.ts).

Better Auth's pinned implementation lowercases email writes, updates, signups, and lookups. The generated unique index on `User.email` therefore enforces uniqueness for values written through those normalized paths. PostgreSQL's ordinary text unique index is case-sensitive by itself: it does not make arbitrary direct SQL writes case-insensitive. Future imports or administrative writers must preserve the normalization contract, or a separately reviewed database normalization constraint/index must be added. No extra index or normalization migration was invented for this phase. See the [pinned internal adapter](https://github.com/better-auth/better-auth/blob/v1.7.12/packages/better-auth/src/db/internal-adapter.ts).

Database rate limiting is explicitly enabled in every environment: **100 requests per 60 seconds**, with **3 sign-in requests per 10 seconds**, and **3 signup, reset-request, or verification-send requests per 60 seconds**. The generated `RateLimit` model has a unique key and `lastRequest BigInt` for epoch milliseconds. The pinned core uses conditional increments and the Prisma adapter implements atomic conditional updates, avoiding a separate read/write counter increment. Concurrency enforcement is verified only by source inspection here. [Official rate-limit guidance](https://better-auth.com/docs/concepts/rate-limit) also states that direct `auth.api` calls bypass the HTTP rate limiter. Phase B must protect any server API entry point and configure trustworthy connecting-IP handling for the actual hosting proxy, ensuring it overwrites/sanitizes forwarded IP headers and the origin cannot be reached around it. This packet does not assume an unverified proxy chain is trustworthy.

## Schema generation provenance

[`scripts/generate-auth-schema.mjs`](../scripts/generate-auth-schema.mjs) imports `generatePrismaSchema` from the official, pinned **`auth@1.7.12` `auth/api` export** and passes the same `authOptions` used by runtime. The generator receives metadata from the pinned Prisma adapter with PostgreSQL and transactions enabled. A guarded mock client permits only the adapter's optional `_runtimeDataModel` probe; any other property access throws. It never imports runtime credentials or constructs a live client. Reported schema problems or unsafe changes stop the write. The result includes database-backed rate limits because `rateLimit.storage` is `database`.

The [official CLI documentation](https://better-auth.com/docs/concepts/cli) supports Prisma schema generation without a database connection. The project wrapper invokes that installed package's exported generator directly to make offline operation explicit and reproducible. The existing generator block preserves Prisma 7's `prisma-client` provider and explicit output; the datasource contains its provider only. No handwritten auth fields, role system, custom IDs, or extra core-table constraints are added. In particular, `Account.issuer` is absent: the [official 1.7 upgrade guide](https://better-auth.com/docs/guides/1-7-upgrade-guide) explains that the temporary requirement in 1.7.0–1.7.2 was removed in 1.7.3.

Offline review commands use installed pinned packages:

```bash
npm run auth:schema
npm run db:generate
npm run db:validate
npm run db:diff
```

`db:diff` is exactly `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`. It compares the empty model to the local schema and prints SQL. It neither inspects nor modifies any database. No `migrate dev`, `migrate deploy`, `db push`, `db execute`, introspection, or shadow-database connection was used. The prepared SQL is stored at [`prisma/migrations/20261024000000_auth_foundation/migration.sql`](../prisma/migrations/20261024000000_auth_foundation/migration.sql), with PostgreSQL provider metadata in [`migration_lock.toml`](../prisma/migrations/migration_lock.toml).

## Complete schema snapshot

Source: [`prisma/schema.prisma`](../prisma/schema.prisma). The following is the complete current generated schema, with no database URL embedded:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id            String    @id
  name          String
  email         String
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
  accounts      Account[]

  @@unique([email])
  @@map("user")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])
  @@index([userId])
  @@map("session")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  @@index([userId])
  @@map("account")
}

model Verification {
  id         String   @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@map("verification")
}

model RateLimit {
  id          String @id
  key         String
  count       Int
  lastRequest BigInt

  @@unique([key])
  @@map("rateLimit")
}
```

## Complete prepared migration SQL snapshot

Source: [`prisma/migrations/20261024000000_auth_foundation/migration.sql`](../prisma/migrations/20261024000000_auth_foundation/migration.sql). Prepared locally for review only; not executed:

```sql
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rateLimit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,

    CONSTRAINT "rateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "rateLimit_key_key" ON "rateLimit"("key");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

The migration creates five mapped tables: `user`, `session`, `account`, `verification`, and `rateLimit`. It includes unique indexes for normalized email values, session tokens, and rate-limit keys; lookup indexes for user foreign keys and verification identifiers; and cascade deletion of sessions/accounts with their user. IDs are text generated by Better Auth, rather than database defaults. `updatedAt` is managed by Prisma. It does not seed accounts or create public credentials.

## Initial Phase A changed-file inventory

The following 20-file inventory records the initial Phase A implementation, with the descriptions updated for the security correction. The correction also adds permanent regression tests under [`tests/security`](../tests/security); its complete inventory and current results belong to the separate correction evidence. Generated `src/generated/prisma` and build output are ignored artifacts and are not proposed source changes.

| File                                                                                                                                  | Purpose                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [`.gitignore`](../.gitignore)                                                                                                         | Ignore generated Prisma client code                               |
| [`.nvmrc`](../.nvmrc)                                                                                                                 | Select security-patched Node 22.23.4                              |
| [`.prettierignore`](../.prettierignore)                                                                                               | Exclude generated Prisma client code                              |
| [`README.md`](../README.md)                                                                                                           | Update phase scope, architecture, and offline commands            |
| [`eslint.config.mjs`](../eslint.config.mjs)                                                                                           | Exclude generated Prisma client code                              |
| [`package.json`](../package.json)                                                                                                     | Pinned foundation dependencies, engines, ESM, and offline scripts |
| [`package-lock.json`](../package-lock.json)                                                                                           | Reproducible dependency resolution                                |
| [`tsconfig.json`](../tsconfig.json)                                                                                                   | ES2023 target for Prisma 7                                        |
| [`.env.example`](../.env.example)                                                                                                     | Sanitized variable names and blank credential values              |
| [`prisma.config.ts`](../prisma.config.ts)                                                                                             | Prisma 7 CLI config with unpooled migration URL                   |
| [`prisma/schema.prisma`](../prisma/schema.prisma)                                                                                     | Exact pinned auth schema                                          |
| [`prisma/migrations/20261024000000_auth_foundation/migration.sql`](../prisma/migrations/20261024000000_auth_foundation/migration.sql) | Prepared SQL, not applied                                         |
| [`prisma/migrations/migration_lock.toml`](../prisma/migrations/migration_lock.toml)                                                   | PostgreSQL migration metadata                                     |
| [`scripts/generate-auth-schema.mjs`](../scripts/generate-auth-schema.mjs)                                                             | Guarded offline official schema generator                         |
| [`src/lib/env.ts`](../src/lib/env.ts)                                                                                                 | Sanitized validation shared by runtime/CLI                        |
| [`src/lib/env.server.ts`](../src/lib/env.server.ts)                                                                                   | Lazy server-only runtime environment                              |
| [`src/lib/db.server.ts`](../src/lib/db.server.ts)                                                                                     | Lazy pooled server-only Prisma client                             |
| [`src/lib/auth/options.ts`](../src/lib/auth/options.ts)                                                                               | Shared auth policy and closed email callbacks                     |
| [`src/lib/auth/server.ts`](../src/lib/auth/server.ts)                                                                                 | Lazy server-only Better Auth factory                              |
| [`docs/milestone-03-phase-a-review.md`](milestone-03-phase-a-review.md)                                                               | Review packet and schema/SQL snapshots                            |

No landing-page or dashboard implementation file is changed.

## Historical initial Phase A verification

The table below preserves the initial implementation's reported results under **Node 22.21.1**. It is historical evidence, not a fresh security-correction result or approval of that runtime. The independent audit subsequently reproduced 48 named groups containing 318 native assertion calls in the temporary script at `/tmp/bcs-auth-offline-checks.mjs`. It used synthetic values and a guarded memory adapter. Only fake RateLimit records were accessible; user, account, session, and verification queries would throw. No real database was involved. The correction pass adds permanent tests; CI remains deferred.

| Check                                                                                                                        | Historical initial result                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Branch/base and uncommitted diff inventory                                                                                   | **Passed:** `feat/auth-foundation`; HEAD and main equal `52413831a3e0786f21f1e739f70f8973dfa55038`; 20 changed files                                                                                                                                                                                         |
| Official compatibility/security guidance                                                                                     | Rechecked against the primary sources linked above and installed package metadata                                                                                                                                                                                                                            |
| Pinned dependency tree / npm audit                                                                                           | **Passed:** exact requested versions installed; npm installation audited 597 packages and reported **0 vulnerabilities**                                                                                                                                                                                     |
| Offline `npm run auth:schema`, exact schema inspection, regeneration stability                                               | **Passed:** five generated models inspected; regeneration leaves schema byte-for-byte unchanged                                                                                                                                                                                                              |
| `npm run db:generate`                                                                                                        | **Passed:** Prisma Client 7.10.1 generated locally                                                                                                                                                                                                                                                           |
| `npm run db:validate`                                                                                                        | **Passed:** valid Prisma schema; pinned engine downloaded, no database connection                                                                                                                                                                                                                            |
| `npm run db:diff`, SQL matches prepared file                                                                                 | **Passed:** repeated empty-to-local-schema diff matches prepared SQL                                                                                                                                                                                                                                         |
| Environment and auth security assertions                                                                                     | **Passed: 48 named groups** (318 assertion calls in the audit replay), including malformed URL redaction, TLS/host override rejection, signup disabled, reset/resend uniformly unavailable, safe cookies, active CSRF/origin checks, hostile callback rejection, and HTTP memory rate limiting returning 429 |
| `npm run lint`                                                                                                               | **Passed:** no warnings or errors                                                                                                                                                                                                                                                                            |
| `npm run typecheck`                                                                                                          | **Passed:** generated Prisma/Next types and TypeScript check                                                                                                                                                                                                                                                 |
| `npm run format:check`                                                                                                       | **Passed:** all matched files use Prettier style                                                                                                                                                                                                                                                             |
| Credentials-free `npm run build`                                                                                             | **Passed:** Next 16.4.3 production build; public pages statically prerendered                                                                                                                                                                                                                                |
| Public landing page and `/dashboard` preservation                                                                            | **Passed:** public source unchanged against baseline; both routes are present in prerender manifest; auth handler absent from build manifest                                                                                                                                                                 |
| Final diff and credential hygiene review                                                                                     | **Passed:** whitespace check, tracked and untracked inventory, credential-pattern scan (no matches), and env/generated-client ignore checks                                                                                                                                                                  |
| Database migration execution                                                                                                 | **Not run; expressly prohibited in Phase A**                                                                                                                                                                                                                                                                 |
| Live PostgreSQL integration, schema introspection, reset transaction rollback, rate-limit contention, and session revocation | **Untested; no database contacted**                                                                                                                                                                                                                                                                          |
| Real verification/reset email delivery, mailbox receipt, token consumption, and end-to-end recovery                          | **Untested; delivery is intentionally unavailable**                                                                                                                                                                                                                                                          |

## Security correction status

The correction is limited to three reported defects: Node's security floor, unsupported versioned-secret input, and unsupported trusted-origin input. It preserves signup, delivery, session, reset, rate-limit, CSRF, origin, proxy-header and cookie policies. The Prisma schema and prepared SQL are unchanged. The public landing page and `/dashboard` remain demonstrations without auth routes or forms.

The permanent offline test command is `npm run test:security`, using Prisma client generation followed by Node's built-in test runner with TypeScript stripping and the `react-server` condition. Tests use synthetic values, isolated environment cases and guarded in-memory behavior. They do not prove PostgreSQL transactions, pool/TLS behavior, reset/session revocation, concurrent database rate limiting, email delivery or recovery.

Fresh verification is recorded below. Passing historical rows above must not be interpreted as fresh results.

An additional dependency precedence issue was discovered in the earlier correction: `@better-auth/telemetry@1.7.12` permits `BETTER_AUTH_TELEMETRY=true` to override explicit `telemetry.enabled: false` when an endpoint is supplied. It was unresolved in that earlier pass. The final readiness correction below now contains it at the application's runtime and supported schema-generation boundaries. Other reviewed core fallbacks for base URL, singular secret, cookies, CSRF/origin policy and rate limiting did not override the current explicit options.

Phase A awaits independent security review. Phase B authentication endpoints/forms, real email delivery and recovery tests, and any later Phase C functionality remain deferred. This packet provides no production enablement or migration-execution instructions.

## Previous Phase A verification — 24 October 2026

The verification below used the actual **Node v22.23.4** binary and npm **10.9.9** from the temporary runtime installation. The project selects that Node release through `.nvmrc`; no system runtime installation was changed.

| Check                               | Current result                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Branch/base                         | `feat/auth-foundation`; HEAD, local main and fetched origin/main remain `52413831a3e0786f21f1e739f70f8973dfa55038`                  |
| `npm run lint`                      | Passed, zero warnings                                                                                                               |
| `npm run typecheck`                 | Passed, including Prisma and Next type generation                                                                                   |
| `npm run format:check`              | Passed; rerun after this packet update                                                                                              |
| `npm run build`                     | Passed without auth/database environment variables; `/` and `/dashboard` are static public pages; no auth endpoint is mounted       |
| `npm run test:security`             | **72 passed**, zero failed/skipped; network/listeners forbidden by the test helpers                                                 |
| `npm run db:validate`               | Passed without a database connection                                                                                                |
| Pinned schema reproduction          | Passed; official generator leaves `prisma/schema.prisma` byte-for-byte unchanged                                                    |
| Offline SQL reproduction            | Passed; `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script` matches the prepared migration file            |
| Dependency audit                    | Recorded npm 10.9.9 lockfile audit reports zero known vulnerabilities; this is not a live-database or runtime security guarantee    |
| Clean-install evidence              | The isolated npm-ci attempt failed with npm's `Exit handler never called!`; a successful clean installation is **not claimed**      |
| Public implementation preservation  | No changes to `src/app`, components, content, dashboard types, or existing public helpers                                           |
| Database migrations / live delivery | **Not executed**; PostgreSQL constraints, reset rollback/revocation, rate-limit contention, and real email delivery remain untested |

The sandbox initially blocked child processes with `EPERM`, causing the build's TypeScript-configuration step and isolated initialization probes to fail. Both commands passed after native approval to run outside that sandbox. The approved test run retained its network guards and synthetic fixtures; it did not use a real database or sender.

The current inventory contains **28 source/configuration/documentation files**, with nothing staged. In addition to the 20 files listed above, these eight test files are included for review:

- [`tests/security/environment.test.mjs`](../tests/security/environment.test.mjs)
- [`tests/security/initialization.test.mjs`](../tests/security/initialization.test.mjs)
- [`tests/security/policy.test.mjs`](../tests/security/policy.test.mjs)
- [`tests/security/helpers/fixtures.mjs`](../tests/security/helpers/fixtures.mjs)
- [`tests/security/helpers/initialization-probe.mjs`](../tests/security/helpers/initialization-probe.mjs)
- [`tests/security/helpers/memory-auth.mjs`](../tests/security/helpers/memory-auth.mjs)
- [`tests/security/helpers/offline.mjs`](../tests/security/helpers/offline.mjs)
- [`tests/security/helpers/server-resolver.mjs`](../tests/security/helpers/server-resolver.mjs)

All test credentials and reserved `.test` addresses are synthetic. Generated Prisma code, node_modules, `.next`, and real environment files remain ignored. No commit, push, merge, deployment, or database migration was performed.

## Final security review readiness — 24 October 2026

The telemetry correction changes only the existing unsupported-variable guard and its schema-script entry point, regression coverage, and documentation. The complete current Phase A inventory is still **28 changed files**. Package versions, the lockfile, auth policy, public UI, generated schema, and prepared migration are unchanged by this correction. Source-file hashes and a complete tracked-plus-untracked diff are provided with the review ZIP.

### Telemetry containment and source references

The installed `@better-auth/telemetry@1.7.12` implementation at `dist/index.mjs:347` reads debug mode from the option OR `BETTER_AUTH_TELEMETRY_DEBUG`, selects its endpoint from `BETTER_AUTH_TELEMETRY_ENDPOINT`, and enables collection from the option OR `BETTER_AUTH_TELEMETRY`. Without an endpoint or a custom tracking sink it returns a no-op. When enabled with an endpoint, debug mode logs events; otherwise it posts them. The environment flag can therefore override an application opt-out. These are source-level findings; no real telemetry requests were sent.

| Correction verified                                                              | Actual source reference                                                                                               |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Node pin                                                                         | `.nvmrc:1`; `package.json` and lockfile engines both require `^22.23.4 \|\| ^24.22.1`                                 |
| All five unsupported variables, including empty definitions                      | `src/lib/env.ts:7`; presence is checked with `!== undefined`                                                          |
| Names-only errors without values or attached causes                              | `src/lib/env.ts:17` and `src/lib/env.ts:153`                                                                          |
| Validation before new or cached auth access                                      | `src/lib/auth/server.ts:35`; guard precedes `createAuth()` and `betterAuth()`                                         |
| Lazy, server-only environment loading                                            | `src/lib/env.server.ts:1`                                                                                             |
| Explicit telemetry opt-out retained                                              | `src/lib/auth/options.ts:79`                                                                                          |
| Guard before supported schema generator initialization                           | `scripts/generate-auth-schema.mjs:10`                                                                                 |
| Runtime, schema, and cached-initialization regressions                           | `tests/security/initialization.test.mjs:18`, `:82`, and `:91`                                                         |
| No events even with a synthetic tracking sink and test-mode suppression bypassed | `tests/security/policy.test.mjs:81`; `skipTestCheck: true` prevents test mode from concealing accidental activation   |
| Exception property/value redaction and environment immutability                  | `tests/security/environment.test.mjs:19` and `:317`                                                                   |
| Network/listener refusal in isolated test processes                              | `tests/security/helpers/offline.mjs:4`; initialized before production imports in `helpers/initialization-probe.mjs:7` |

The schema tests run the actual generator entry point in an empty temporary directory, verify rejection before any file is written, and retain network guards. Normal schema generation with the variables absent reproduces the exact schema. Direct third-party CLI calls such as `npx auth` are not application entry points and are not covered by this guard. Prisma's standalone commands do not initialize Better Auth; their own telemetry settings are separate.

### Clean-install diagnosis

The previous isolated debug log contains **15 registry tarball fetch failures with `EAI_AGAIN`**, followed by npm's `Exit handler never called!` error. No `EACCES`, `EPERM`, `EBADENGINE`, or lockfile-sync `EUSAGE` appears in that log, and no lifecycle script had started. Unsupported-platform optional-package pruning is normal and was not the failure. The immediate cause evidenced by the log is DNS/registry access failure; npm's secondary exit-handler failure does not provide enough detail to diagnose npm internals further.

A new temporary workspace copied the project source without Git metadata, credentials, dependencies, or generated artifacts. With native network approval, Node **22.23.4** / npm **10.9.9**, empty npm configuration, a **fresh cache**, and lifecycle scripts **enabled**, this exact command succeeded:

```text
npm ci --no-audit --no-fund --foreground-scripts --fetch-retries=0 --fetch-timeout=30000
```

It installed **596 packages in 33 seconds**. Prisma preinstall, Prisma engines postinstall, and unrs-resolver postinstall exited successfully. The lockfile SHA-256 remained identical. There is no evidence requiring a lockfile regeneration, dependency upgrade, runtime compatibility fix, cache permission fix, or install-script change. No installation command was run against the original workspace in this correction. Sanitized old failure logs and new success logs accompany the ZIP.

### Final checks

| Check                                                                         | Final result under Node 22.23.4/npm 10.9.9                                 |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `npm run lint`                                                                | Passed, zero warnings                                                      |
| `npm run typecheck`                                                           | Passed                                                                     |
| Formatting                                                                    | Targeted formatting applied; `npm run format:check` passed                 |
| `npm run build`                                                               | Passed without credentials; existing public routes remain static           |
| `npm run test:security`                                                       | **118 passed**, zero failed/skipped; no real telemetry or database traffic |
| `npm run db:validate`                                                         | Passed offline                                                             |
| `npm run auth:schema`                                                         | Passed; schema byte-for-byte identical                                     |
| Empty-to-schema SQL comparison                                                | Passed; exact prepared SQL match                                           |
| Migration and lockfile hashes                                                 | Unchanged from the start of this correction                                |
| `git diff --check`                                                            | Passed                                                                     |
| Isolated `npm ci`                                                             | Passed with fresh cache and install scripts enabled                        |
| Live database, migrations, email delivery, signup/recovery, production deploy | Not executed; prohibited or deferred                                       |

Only synthetic test fixtures contain connection strings or token-shaped values. They are explicitly marked, use loopback/reserved `.test` destinations, and are included unchanged as actual test source. The ZIP excludes real environment files, real secrets, credentials, dependency directories, build output, generated Prisma client code, and private Git data. It contains the complete current source, all 28 changed files, a full inventory and SHA-256 manifest, source diffs, reproducible command runners, and sanitized evidence. Final approval remains with the independent reviewer; Phase B has not started.
