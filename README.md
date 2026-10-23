# BCS Mentor

A Bangla-first BCS preparation platform, starting with a responsive landing page and a clean application foundation.

## Current scope

- Bengali landing page with subject introductions, a preparation guide, and FAQs.
- Interactive **sample** study plan: switch between three days and mark tasks complete.
- Responsive navigation, keyboard controls, focus states, a skip link, and reduced-motion support.
- Bengali metadata, a custom favicon, and a Bengali 404 page.

The plan is illustrative, not a complete or official BCS syllabus. Changes exist only in browser memory and reset on refresh. Authentication, AI, a database, real study tracking, payments, and API routes are **not implemented**.

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
│   └── not-found.tsx          # Bengali 404 page
├── components/
│   ├── layout/                # Brand, responsive header, footer
│   ├── landing/               # Hero, sample plan, subjects, guide, FAQs
│   └── ui/icon.tsx            # Small, typed SVG icon set
├── content/landing.ts         # Typed Bengali content and illustrative plan data
└── lib/site.ts                # Shared site description and navigation
```

### Major choices

1. **Next.js App Router and strict TypeScript.** Routes live in `src/app`. The `@/*` alias resolves to `src/*`. The home page uses Server Components by default and is statically generated at build time.
2. **Small client boundaries.** Only the mobile navigation and sample study plan use React state. The plan uses native radio buttons, checkboxes, and a progress element. Subject and FAQ disclosures use native HTML `details` elements, requiring no client state.
3. **Tailwind CSS 4 and PostCSS.** Design tokens live in `globals.css` using `@theme`; a separate Tailwind config is unnecessary. The palette pairs warm ivory with deep green. Mobile-first layouts adapt to narrow phones, tablets, and desktops.
4. **Bengali first.** The document uses `lang="bn"`, Bengali interface copy, and Bengali number formatting. Noto Sans Bengali is bundled through Fontsource, so builds and page loads do not request Google Fonts. Its upstream license is included in the installed package.
5. **Content separate from presentation.** Edit example tasks, subjects, preparation steps, and FAQs in `src/content/landing.ts`. Shared navigation and metadata come from `src/lib/site.ts`. The examples are clearly labeled; there are no invented user counts, testimonials, or live-service claims.
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

Suggested initial commit message:

```text
feat: initialize BCS Mentor with Next.js and Bangla landing page
```
