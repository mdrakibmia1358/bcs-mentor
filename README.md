# BCS Mentor

A Bangla-first BCS preparation platform with a responsive landing page and an illustrative student dashboard.

## Current scope

- Bengali landing page with subject introductions, a preparation guide, and FAQs.
- Interactive **sample** study plan: switch between three days and mark tasks complete.
- `/dashboard` student demo with responsive sidebar/mobile navigation, summary cards, an interactive daily checklist, weekly activity, subject progress, and upcoming revisions.
- Responsive navigation, keyboard controls, focus states, a skip link, and reduced-motion support.
- Bengali metadata, a custom favicon, and a Bengali 404 page.

All plans, dates, study times, topic counts, and progress are illustrative, not real learner records or a complete or official BCS syllabus. Changes exist only in browser memory and reset on refresh. Milestone 03 Phase A adds server-only authentication configuration, environment validation, and an offline-generated database schema and migration SQL for review. No database migration has been executed, and no authentication handler or forms are mounted. AI, real study tracking, payments, and application API routes remain outside this scope.

## Milestone 02: student dashboard

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard), or follow **ড্যাশবোর্ড ডেমো / Dashboard Demo** from the landing page header, mobile menu, or footer. No account is required.

- Desktop sidebar links navigate to real dashboard sections. Below 1024px, a disclosure menu supports keyboard navigation, Escape to close, and focus restoration. A skip link moves directly to the main content.
- Four summary cards show today's illustrative study time, completed checklist tasks, sample syllabus progress, and upcoming revisions. The initial data shows **95 minutes**, **2 of 5 tasks**, **42 of 120 sample topics (35%)**, and **3 revisions**.
- The daily plan includes subject, topic, estimated duration, and native checkbox controls. Filter by all, remaining, or completed tasks; use **ডেমো রিসেট** to restore the initial checklist. The completed-task card and live announcement update together. Completing every task reveals an empty state in the remaining filter.
- Weekly activity uses a CSS bar chart with readable values and full dates available to assistive technology. Native progress elements show each subject's illustrative progress. Revision dates are ordered chronologically. Sections also handle missing tasks, empty activity, no subjects, and no upcoming revisions.
- The fixed sample day is **24 October 2026**; the sample week is **18–24 October 2026**. Dates are formatted in Bengali with the `Asia/Dhaka` timezone. They do not follow the actual current date.
- Task ticks update only the transient checklist and its count. They do **not** measure time, change the static syllabus or activity data, schedule reminders, or save anything. Reloading or leaving and reopening the dashboard restores the initial fixture. There is no localStorage, cookie, backend, API, authentication, or AI integration.
- The demo route has its own Bengali metadata and `noindex` setting. The dashboard implementation uses no chart library.

## Milestone 03 Phase A: authentication and database foundation

Better Auth and Prisma 7 are configured behind lazy, server-only accessors. Public signup is disabled in code, email delivery callbacks fail closed, and password sign-in requires verified email. The configuration retains CSRF and origin checks, uses database sessions without a session cookie cache, enables database rate limiting, and requests session revocation on password reset. There is no auth route handler, UI, or public signup switch yet.

The schema and prepared migration SQL are review artifacts. Schema generation, Prisma client generation, schema validation, and SQL diff generation run without credentials or a database connection. The public landing page and `/dashboard` demo still run without environment configuration. See the [Phase A review packet](docs/milestone-03-phase-a-review.md) for the exact schema, SQL snapshot, package guidance, environment contract, and verification status. Database integration, real email delivery, and recovery remain untested and deferred.

Phase A supports only the validated singular `BETTER_AUTH_SECRET` and the exact origin derived from `BETTER_AUTH_URL`. `BETTER_AUTH_SECRETS`, `BETTER_AUTH_TRUSTED_ORIGINS`, `BETTER_AUTH_TELEMETRY`, `BETTER_AUTH_TELEMETRY_ENDPOINT`, and `BETTER_AUTH_TELEMETRY_DEBUG` are unsupported: any definition, including an empty string or `false`, causes a sanitized error. Validation checks these names when reading runtime configuration, before `getAuth()` returns a new or cached instance, and before the supported `npm run auth:schema` entry point initializes its adapter/generator. Telemetry remains explicitly disabled. The application does not delete or rewrite environment variables, add rotation support, or accept extra trusted origins. Direct vendor CLI invocations are outside this application guard; use the documented schema command.

## Local setup

Use Node.js **22.23.4**, selected by `.nvmrc`, and npm 10 or newer. The package engines allow `^22.23.4 || ^24.22.1`. These security minima follow the official October 21, 2026 releases for [Node 22.23.4](https://nodejs.org/en/blog/release/v22.23.4) and [Node 24.22.1](https://nodejs.org/en/blog/release/v24.22.1); dependency compatibility alone does not establish a patched runtime. The lockfile resolves TypeScript **5.9.3**, above Prisma 7's **5.4** minimum. Final readiness checks used Node 22.23.4/npm 10.9.9, passed 118 offline security tests, and reproduced a clean installation in an isolated workspace with a fresh cache and install scripts enabled. See the review packet for evidence and limitations.

```bash
nvm use                 # Optional: if nvm is installed
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Public pages, offline generation, and the production build require no environment variables, credentials, or external services. `.env.example` lists the future server configuration with blank credential values; copying it does not enable authentication. Runtime configuration is validated only when the server-only auth or database accessor is used.

```bash
npm run lint            # ESLint; warnings fail the check
npm run typecheck       # Generate Prisma and Next.js types, then check TypeScript
npm run format:check    # Verify formatting without changing files
npm run build           # Generate Prisma client, then build the public pages
npm start               # Serve the production build

npm run auth:schema     # Generate Better Auth schema offline using pinned auth/api
npm run db:generate     # Generate Prisma client locally; does not connect to a DB
npm run db:validate     # Validate the Prisma schema without connecting to a DB
npm run db:diff         # Print empty-to-schema SQL only; does not apply it
npm run test:security   # Offline synthetic auth/environment regression tests
```

Run `npm run format` to apply formatting. Commit `package-lock.json` with dependency changes. Use `npm ci` to reproduce the locked installation.

## Architecture

```text
src/
├── app/
│   ├── layout.tsx             # Bengali document language, local font, metadata
│   ├── page.tsx               # Compose the landing page sections
│   ├── globals.css            # Tailwind theme, shared styles, accessibility
│   ├── icon.svg               # Brand favicon
│   ├── dashboard/             # Dashboard route, metadata, and reusable shell
│   └── not-found.tsx          # Bengali 404 page
├── components/
│   ├── layout/                # Brand, responsive header, footer
│   ├── landing/               # Hero, sample plan, subjects, guide, FAQs
│   ├── dashboard/             # Shell, checklist, summaries, activity, progress, revisions
│   └── ui/icon.tsx            # Small, typed SVG icon set
├── content/
│   ├── landing.ts             # Bengali landing copy and sample plan
│   └── dashboard.ts           # Fixed, explicitly illustrative dashboard records
├── types/dashboard.ts        # Readonly TypeScript contracts for demo records
└── lib/
    ├── site.ts                # Shared site description and navigation
    ├── dashboard.ts           # Bengali formatting and syllabus aggregation
    ├── env.ts                 # Sanitized runtime and migration validation
    ├── env.server.ts          # Lazy server-only runtime environment accessor
    ├── db.server.ts           # Lazy server-only Prisma PostgreSQL client
    └── auth/
        ├── options.ts         # Shared auth policy, signup gate, closed email callbacks
        └── server.ts          # Lazy server-only Better Auth configuration

prisma.config.ts               # Prisma 7 CLI uses unpooled DIRECT_URL only
prisma/schema.prisma           # Exact pinned Better Auth generator output
prisma/migrations/             # Prepared SQL for review; never executed in Phase A
scripts/generate-auth-schema.mjs # Guarded offline schema generation
```

### Major choices

1. **Next.js App Router and strict TypeScript.** Routes live in `src/app`. The `@/*` alias resolves to `src/*`. The home page uses Server Components by default and is statically generated at build time.
2. **Small client boundaries.** Mobile navigation and interactive checklists use React state. The dashboard page composes its activity, subject progress, and revision sections on the server and passes them as slots to a client workspace. The workspace owns checklist state and its summary count. Inputs use native radio buttons, checkboxes, and progress elements. Landing subject and FAQ disclosures use native HTML `details` elements, requiring no client state.
3. **Tailwind CSS 4 and PostCSS.** Design tokens live in `globals.css` using `@theme`; a separate Tailwind config is unnecessary. The palette pairs warm ivory with deep green. Mobile-first layouts adapt to narrow phones, tablets, and desktops.
4. **Bengali first.** The document uses `lang="bn"`, Bengali interface copy, and Bengali number formatting. Noto Sans Bengali is bundled through Fontsource, so builds and page loads do not request Google Fonts. Its upstream license is included in the installed package.
5. **Content separate from presentation.** Edit landing examples in `src/content/landing.ts` and dashboard records in `src/content/dashboard.ts`. Dashboard data conforms to readonly interfaces in `src/types/dashboard.ts`; Bengali number/date formatting and syllabus aggregation live in `src/lib/dashboard.ts`. Shared navigation and metadata come from `src/lib/site.ts`. Examples are clearly labeled; there are no invented user counts, testimonials, or live-service claims.
6. **Minimal configuration.** `next.config.ts` enables React strict mode and disables the framework identification header. Next.js uses its supported Webpack mode for development and production: this execution environment blocks the internal local port required by Turbopack's CSS worker. ESLint uses Next.js Core Web Vitals and TypeScript presets. ESLint 9 is pinned because those presets' bundled React, accessibility, and import plugins do not yet declare ESLint 10 compatibility; npm reports ESLint 9's upstream deprecation. Prettier keeps source formatting consistent. npm scripts provide development, production, lint, formatting, and type checks.
7. **Secret hygiene.** `.gitignore` excludes dependencies, generated Prisma client code, build artifacts, local environment files, credential files, and local `.aws`, `.agents`, and `.codex` directories. `.env.example` documents `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` without usable credentials. `NODE_ENV` controls environment validation and cookie policy. Runtime database access uses the pooled URL; Prisma connection commands use only the unpooled URL. Public pages need neither. Validation errors identify invalid or unsupported variable names while hiding values. Never put secrets in `NEXT_PUBLIC_*` variables because they are bundled for the browser. Ignore rules are a safeguard, not a substitute for reviewing the diff.
8. **Authentication foundation.** Better Auth 1.7.12, its Prisma adapter and schema generator, Prisma 7.10.1, the matching PostgreSQL driver adapter, and pg 8.23.1 are pinned. Prisma 7 uses the ESM `prisma-client` generator with explicit output in ignored `src/generated/prisma`. Auth and database clients initialize lazily; the public routes do not import or invoke them. The shared auth options drive both runtime policy and offline schema generation. Migration SQL is generated from an empty schema without a live datasource.

Future phases can add authentication routes, delivery, recovery, and UI after review. Phase A does not enable those public flows or change the demo into a learner account.

## Review before committing

Run lint, type checking, formatting checks, and a production build, then inspect both tracked changes and new files:

```bash
git status --short
git diff
git ls-files --others --exclude-standard
```

`git diff` alone excludes untracked files. Review new files too, or use `git diff --no-index /dev/null <file>` for an individual new file (exit code 1 means differences were found). Check that no credentials or local environment files are included. Commit and push only after explicit approval of the complete diff.

As of **11 November 2026**, Phase A is published in [Draft PR #3](https://github.com/mdrakibmia1358/bcs-mentor/pull/3), with **4 commits and 29 changed files** at HEAD `40519f1eb96b26a3394e11be77326e5bc46d381b`. CI commit `40519f1` adds GitHub Actions validation; [run 42963575524](https://github.com/mdrakibmia1358/bcs-mentor/actions/runs/42963575524) completed successfully.

See the [11 November 2026 addendum](docs/milestone-03-phase-a-review.md#status-addendum--11-november-2026) for the current security-test, dependency-audit, and SQL-comparison evidence. Earlier review results retain their original dates. Phase A awaits independent review before Phase B; keep PR #3 **Draft** and [Issue #2](https://github.com/mdrakibmia1358/bcs-mentor/issues/2) **Open**. No database migration has been applied and no live authentication integration has been performed. This documentation cleanup does not authorize commits, pushes, merges, deployments, migrations, or live authentication enablement.
