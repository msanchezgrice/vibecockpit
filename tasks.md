# Vibe-Cockpit – Phased Development Road-map
_(Next .js 15 • Prisma • Supabase • Vercel)_

Cursor will work best if we tackle one phase per branch → pull-request → merge.  
Each phase lists:

1. **Goal** – the one new user-visible capability.  
2. **What to build** – specific files / edits.  
3. **How to test** – Jest/Playwright cases or manual steps.  
4. **Done when** – acceptance criteria.

---

## Phase 0 – Bootstrap & CI

| Task | File(s) |
|------|---------|
| Scaffold project | `pnpm create next-app vibe-cockpit --ts --tailwind` |
| Add deps | `pnpm add prisma @prisma/client @supabase/supabase-js next-auth zod lucide-react @testing-library/react vitest` |
| Init Prisma & Supabase | `npx prisma init` → creates `schema.prisma`; run `supabase init`. |
| Add GitHub CI | `.github/workflows/ci.yml` running `pnpm test` + `pnpm lint` |

**Tests**  
- `src/__tests__/sanity.test.ts`  
  ```ts
  import { expect, it } from 'vitest';
  it('sanity', () => expect(2 + 2).toBe(4));

Done when pnpm test & pnpm next build are green locally and on GitHub Actions.

⸻

Phase 1 – Schema v1 & Seeder

Goal

Database can store Project rows with status enum.

Build
	•	Flesh out schema.prisma for Project †.
	•	Add prisma/seed.ts to insert two dummy projects.
	•	Run npx prisma migrate dev --name init and commit generated SQL.

†

model Project {
  id             String   @id @default(uuid())
  name           String
  status         ProjectStatus @default(design)
  frontendUrl    String?  @map("frontend_url")
  lastActivityAt DateTime @default(now()) @map("last_activity_at")
  createdAt      DateTime @default(now()) @map("created_at")
}

enum ProjectStatus {
  design
  launched
  paused
  retired
}

Tests
	•	src/__tests__/projectModel.test.ts
	1.	Use @prisma/client with a SQLite memory URL.
	2.	Insert a row, read it back, expect status design.

Done when

pnpm test passes & npx prisma studio shows seeded rows.

⸻

Phase 2 – GitHub OAuth & Session

Goal

User can sign in with GitHub; getServerSession returns their profile.

Build
	•	pages/api/auth/[...nextauth].ts with GitHub provider.
	•	Add /dashboard route that prints session.user?.email.
	•	Store GitHub access token in adapterUser.oauthToken.

Tests
	•	Manual: run pnpm dev, log in, see email printed.
	•	Automated: Playwright headless login test using [next-auth test helper].

Done when

Email renders after sign-in; logout hides it.

⸻

Phase 3 – Project CRUD API

Goal

REST endpoints create/read/update Project.

Build
	•	pages/api/projects/index.ts (POST, GET).
	•	pages/api/projects/[id].ts (PATCH).
	•	Validation with zod.

Tests
	•	Vitest + Supertest: hit POST, expect 201; hit GET, expect array length +1.

Done when

Local fetches in DevTools return correct JSON.

⸻

Phase 4 – Dashboard (List + Card skeleton)

Goal

Render cards for each project with status pill and live links.

Build
	•	components/ProjectCard.tsx (use shadcn <Card>).
	•	app/dashboard/page.tsx queries /api/projects.
	•	Status dropdown triggers PATCH.

Tests
	•	React Testing Library: render card, click dropdown, mock fetch, expect UI update.
	•	Manual: create two projects then reload dashboard.

Done when

Card list shows, status persists after reload.

⸻

Phase 5 – Notes & ChangelogEntry

Goal

Inline notes modal saves markdown & versions it.

Build
	•	Extend schema with ChangeLogEntry table (provider "note").
	•	components/NotesDrawer.tsx with <textarea> autosave.
	•	API: POST /projects/:id/changelog.

Tests
	1.	Unit: save note → DB row count +1.
	2.	UI: modal opens, edits, closes, text preview updates.

Done when

Note displays on card & new entry appears in DB.

⸻

Phase 6 – CostSnapshot nightly cron

Goal

Spend $/mo column appears.

Build
	•	Add CostSnapshot model.
	•	vercel/jobs/cost-collector.ts (Scheduled Function “35 0 * * *”).
	•	Fake implementation returns random costs for dev.

Tests
	•	Unit: job writes one snapshot per project.
	•	Manual: after job, dashboard shows spend value.

Done when

Spend renders & updates after each job run.

⸻

Phase 7 – AnalyticsSnapshot (Visits / Sign-ups)

Goal

Traffic metrics visible.

Build
	•	AnalyticsSnapshot model.
	•	vercel/jobs/analytics-collector.ts using mocked numbers (Math.random).
	•	Card row shows “123 visits ∙ 4 sign-ups”.

Tests
	•	Unit: collector writes row.
	•	UI: metrics appear.

Done when

Values display & update nightly.

⸻

Phase 8 – Vercel, Supabase & GitHub Integrations (real APIs)

Goal

Replace mock collectors with live data.

Build
	1.	Vercel Usage API – costs + visits (needs VERCEL_TOKEN).
	2.	Supabase Admin API – sign-ups (/auth/users?from=).
	3.	GitHub Commits – last 5 push messages into ChangeLogEntry.

Tests
	•	Unit mocks HTTP responses; assert parsing.
	•	Manual: deploy to Vercel Preview, flip a dummy commit, see changelog row.

Done when

Real numbers show on production deploy.

⸻

Phase 9 – Polish & Production Launch

Goal

App is stable on main, live at vibe-cockpit.vercel.app.

Build
	•	Empty states, skeleton loaders.
	•	Error boundary.
	•	README.md with setup doc.
	•	Lighthouse pass > 90.

Tests
	•	Playwright end-to-end: sign in, create project, edit note, status change.
	•	Vercel Preview link auto-comment on PR (GitHub Action).

Done when

Merge PR → Vercel Production deploy green & passing e2e.
