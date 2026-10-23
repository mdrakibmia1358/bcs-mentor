# BCS Mentor

A Bangla-first BCS preparation platform with a responsive landing page and an illustrative student dashboard.

## Current scope

- Bengali landing page with subject introductions, a preparation guide, and FAQs.
- Interactive **sample** study plan: switch between three days and mark tasks complete.
- `/dashboard` student demo with responsive sidebar/mobile navigation, summary cards, an interactive daily checklist, weekly activity, subject progress, and upcoming revisions.
- Responsive navigation, keyboard controls, focus states, a skip link, and reduced-motion support.
- Bengali metadata, a custom favicon, and a Bengali 404 page.

All plans, dates, study times, topic counts, and progress are illustrative, not real learner records or a complete or official BCS syllabus. Changes exist only in browser memory and reset on refresh. Authentication, AI, a database, real study tracking, payments, and API routes are **not implemented**.

## Milestone 02: student dashboard

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard), or follow **ড্যাশবোর্ড ডেমো / Dashboard Demo** from the landing page header, mobile menu, or footer. No account is required.

- Desktop sidebar links navigate to real dashboard sections. Below 1024px, a disclosure menu supports keyboard navigation, Escape to close, and focus restoration. A skip link moves directly to the main content.
- Four summary cards show today's illustrative study time, completed checklist tasks, sample syllabus progress, and upcoming revisions. The initial data shows **95 minutes**, **2 of 5 tasks**, **42 of 120 sample topics (35%)**, and **3 revisions**.
- The daily plan includes subject, topic, estimated duration, and native checkbox controls. Filter by all, remaining, or completed tasks; use **ডেমো রিসেট** to restore the initial checklist. The completed-task card and live announcement update together. Completing every task reveals an empty state in the remaining filter.
- Weekly activity uses a CSS bar chart with readable values and full dates available to assistive technology. Native progress elements show each subject's illustrative progress. Revision dates are ordered chronologically. Sections also handle missing tasks, empty activity, no subjects, and no upcoming revisions.
- The fixed sample day is **24 October 2026**; the sample week is **18–24 October 2026**. Dates are formatted in Bengali with the `Asia/Dhaka` timezone. They do not follow the actual current date.
- Task ticks update only the transient checklist and its count. They do **not** measure time, change the static syllabus or activity data, schedule reminders, or save anything. Reloading or leaving and reopening the dashboard restores the initial fixture. There is no localStorage, cookie, backend, API, authentication, or AI integration.
- The demo route has its own Bengali metadata and `noindex` setting. It introduces no new dependencies or chart libraries.

## Local setup

Use Node.js 22 or newer and npm 10 or newer. `.nvmrc` selects Node.js 22 if you use nvm.

```bash
nvm use                 # Optional: if nvm is installed
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No environment variables, credentials, or external services are required.

```bash
npm run lint            # ESLint; warnings fail the check
npm run typecheck       # Generate Next.js types, then check TypeScript
npm run format:check    # Verify formatting without changing files
npm run build           # Production build and Next.js TypeScript validation
npm start               # Serve the production build
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
    └── dashboard.ts           # Bengali formatting and syllabus aggregation
```

### Major choices

1. **Next.js App Router and strict TypeScript.** Routes live in `src/app`. The `@/*` alias resolves to `src/*`. The home page uses Server Components by default and is statically generated at build time.
2. **Small client boundaries.** Mobile navigation and interactive checklists use React state. The dashboard page composes its activity, subject progress, and revision sections on the server and passes them as slots to a client workspace. The workspace owns checklist state and its summary count. Inputs use native radio buttons, checkboxes, and progress elements. Landing subject and FAQ disclosures use native HTML `details` elements, requiring no client state.
3. **Tailwind CSS 4 and PostCSS.** Design tokens live in `globals.css` using `@theme`; a separate Tailwind config is unnecessary. The palette pairs warm ivory with deep green. Mobile-first layouts adapt to narrow phones, tablets, and desktops.
4. **Bengali first.** The document uses `lang="bn"`, Bengali interface copy, and Bengali number formatting. Noto Sans Bengali is bundled through Fontsource, so builds and page loads do not request Google Fonts. Its upstream license is included in the installed package.
5. **Content separate from presentation.** Edit landing examples in `src/content/landing.ts` and dashboard records in `src/content/dashboard.ts`. Dashboard data conforms to readonly interfaces in `src/types/dashboard.ts`; Bengali number/date formatting and syllabus aggregation live in `src/lib/dashboard.ts`. Shared navigation and metadata come from `src/lib/site.ts`. Examples are clearly labeled; there are no invented user counts, testimonials, or live-service claims.
6. **Minimal configuration.** `next.config.ts` enables React strict mode and disables the framework identification header. Next.js uses its supported Webpack mode for development and production: this execution environment blocks the internal local port required by Turbopack's CSS worker. ESLint uses Next.js Core Web Vitals and TypeScript presets. ESLint 9 is pinned because those presets' bundled React, accessibility, and import plugins do not yet declare ESLint 10 compatibility; npm reports ESLint 9's upstream deprecation. Prettier keeps source formatting consistent. npm scripts provide development, production, lint, formatting, and type checks.
7. **Secret hygiene.** `.gitignore` excludes dependencies, build artifacts, local environment files, credential files, and local `.aws`, `.agents`, and `.codex` directories. No environment file is needed for this version. If configuration is added later, document variable names with placeholder values in `.env.example`; keep real values untracked. Never put secrets in `NEXT_PUBLIC_*` variables because they are bundled for the browser. Ignore rules are a safeguard, not a substitute for reviewing the diff.

Future functionality can add routes and domain-specific components as requirements become concrete. This foundation adds no unused authentication, AI, database, or API scaffolding.

## Review before committing

Run lint, type checking, formatting checks, and a production build, then inspect both tracked changes and new files:

```bash
git status --short
git diff
git ls-files --others --exclude-standard
```

`git diff` alone excludes untracked files. Review new files too, or use `git diff --no-index /dev/null <file>` for an individual new file (exit code 1 means differences were found). Check that no credentials or local environment files are included. Commit and push only after explicit approval of the complete diff.

Suggested Milestone 02 commit message (only after review and approval):

```text
feat: add illustrative Bangla student dashboard
```
