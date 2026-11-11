# Phase B4-A PostgreSQL integration tests

Implementation only: **do not run live tests before independent review and explicit approval**. The suite is separate from the unchanged `test:security` command and is not wired into CI. No migration is applied by these tests.

The future manual entry point is `test:integration`. It requires the caller to explicitly set `ENABLE_NEON_INTEGRATION_TESTS=1`; placing that flag in `.env` does not opt in. Default discovery skips the live suite; direct activation attempts fail closed. A UUID-shaped environment marker is not authorization: the isolated child requires a fresh nonce handshake over a private inherited pipe from its parent, and independently rejects every environment key except the three fixed runner keys. CI environments are refused even with opt-in. No live run, database write, or migration was performed during this implementation.

## Local prerequisites and identity checks

- Use the pinned Node runtime and already-generated Prisma client. The Git branch must be exactly `feat/auth-db-integration`, descended from reviewed baseline `2b8f4e7dd57f175c8cd3483a12e08e3b592a99f1`.
- Credentials come only from the repository's **ignored, untracked, regular, non-symlink `.env` file owned by the current OS user with exactly mode `600`**. No `.env.local`, inherited database variables, connection overrides, or CLI URL arguments are accepted. The runner constructs the child environment from scratch: only the opt-in flag, generated run ID, and `NODE_ENV=test` are passed. Inherited `PG*`, `NODE_OPTIONS`, TLS/debug settings, credentials, and search/temp paths are excluded. The file is opened with `O_NOFOLLOW` and its descriptor is checked again for ownership, type, and permissions before reading.
- `.env` must supply the existing production configuration keys `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_URL`, and `BETTER_AUTH_SECRET`. The existing validators are reused. `NODE_ENV` must be absent or `test`; the isolated test client uses `test`. Unsupported Better Auth overrides are rejected.
- The pooled host is exactly `ep-patient-band-aoj9br9e-pooler.c-2.ap-southeast-1.aws.neon.tech`; the direct host is exactly `ep-patient-band-aoj9br9e.c-2.ap-southeast-1.aws.neon.tech`. Both URLs require database `neondb`, the same nonempty role/password, port 5432 or its default, and exactly `sslmode=verify-full` plus `channel_binding=require`. Other query parameters, fragments, alternate hosts, and encoded database names are refused. The direct URL is validated, never used to run a migration or open another SQL connection.
- `.env` must also supply `NEON_PROJECT_ID`, `NEON_INTEGRATION_BRANCH_ID`, and `NEON_API_KEY` for **read-only** endpoint/branch verification. Use a key scoped to the relevant project. The project must equal `old-hill-91650824` and the branch must equal `br-soft-snow-aokt2rxj`; another syntactically valid ID is rejected. Only these approved, non-secret identities are pinned in source; credentials remain local. The suite never creates an API key, endpoint, branch, database, role, or credential.
- A verified hostname alone cannot establish that a branch is still non-default. Before each transaction, including cleanup, the suite reads the fixed [Neon endpoint API](https://neon.com/docs/reference/api/endpoints/get-project-endpoint) and [branch API](https://neon.com/docs/reference/api/branches/get-project-branch). The approved endpoint must match the expected project/branch and direct hostname, be read-write, and belong to a ready branch with explicit `default: false` and `protected: false`. Missing fields, redirects, denied API access, timeouts, and ambiguous identity fail closed.
- Within the transaction, SQL confirms `current_database()`, `current_user`, `current_schema()`, and a writable primary. The sole migration history row must be `20261024000000_auth_foundation`, successfully finished, not rolled back, with one applied step and the reviewed SHA-256 checksum. The local migration and schema must also match their reviewed hashes. New migration history requires a separately reviewed update to the test guard.
- Before any production validator, Prisma factory, or resolver is imported, a built-in-only bootstrap verifies SHA-256 hashes pinned to the reviewed baseline for `src/lib/db.server.ts`, `src/lib/env.server.ts`, `src/lib/env.ts`, `tests/security/helpers/server-resolver.mjs`, and `package-lock.json`, as well as the schema and migration. Source drift, missing files, or symlink replacements fail closed. The same local checks run before every transaction.

The production `getPrisma()` factory is imported unchanged through the existing test-only TypeScript resolver. It uses the actual generated Prisma client and `PrismaPg` adapter, including production pool limits, TLS URL configuration, and enabled channel binding. No second ORM or replacement database implementation is introduced.

## Checks and cleanup

Node's built-in test runner executes these checks sequentially:

1. Pooled Prisma connection and a simple query, after identity/migration preflight.
2. Synthetic User create, read, update, and delete.
3. Duplicate email rejection (`P2002`).
4. Duplicate session token rejection across two synthetic users (`P2002`).
5. Session foreign key rejection (`P2003`).
6. Account foreign key rejection (`P2003`).
7. User deletion cascading to the current run's Session and Account records.
8. Rollback of User, Session, and Account creation after a deliberate transaction exception.
9. Exact-ID cleanup and confirmation that all current-run records are absent.

Identifiers and session tokens use random UUIDs; emails use only the reserved `.test` domain. Successful creates are registered in memory before commit, permitting exact-ID cleanup after an ambiguous commit. Failed/colliding inserts are never registered as owned. Cleanup uses individual deletes only for recorded IDs; there is no prefix-based/bulk cleanup, table reset, or schema mutation. A user cascade is refused if unexpected child IDs are found; the parent row is locked against concurrent foreign-key inserts during that check and deletion. The outer `finally` always attempts cleanup and disconnect, including after failed constraints or assertions. SQL statement/lock timeouts and transaction limits bound ordinary failures.

Auth/email modules are not initialized. HTTP listeners and HTTP/email request helpers are blocked in the test process; only the captured HTTP client for fixed read-only Neon identity checks is retained. Database errors, API responses, credentials, URLs, and tokens are never printed. The parent publishes only allowlisted test names, fixed outcome messages, and its locally generated synthetic run ID for independent residue investigation. The run ID is not a credential or session token. Child diagnostics and stderr are discarded.

## Limits before live approval

- The live suite has **not been executed**. Offline guard tests validate synthetic configuration, exact IDs, reviewed source drift, file permissions/ownership/Git state, metadata, migration history, redaction, and isolated child launch behavior. Direct-invocation probes block credential-file reads, production imports, and networking; they do not prove live permissions, pooling, constraints, or cleanup.
- These checks assume a trusted Node runtime, installed dependencies, and reviewed runner/test sources. The lockfile hash does not attest installed `node_modules` or generated Prisma bytes. The pipe prevents marker-only direct activation; it is not an OS security boundary against an attacker controlling the same user account, launch code, or runtime preloads. Avoid concurrent source or `.env` changes during a run.
- Neon API access and the exact locally supplied project/branch identities are additional prerequisites. Missing verification access blocks all test writes rather than trusting a branch label or hostname alone.
- Branch metadata cannot be atomically locked with a PostgreSQL transaction. Do not promote, restore, or reconfigure the endpoint/branch during a run. Rechecks reduce but cannot eliminate that control-plane race.
- Forced termination, process failure, lost connections, or a branch becoming unsafe can leave synthetic residue. The suite reports failure and never expands cleanup to other runs or unknown records. Investigate manually under separate approval; do not add broad cleanup to recover automatically.
- These are Prisma/PostgreSQL tests, not live Better Auth, email delivery, signup, or recovery tests. No production authentication behavior or public page changes are included.
