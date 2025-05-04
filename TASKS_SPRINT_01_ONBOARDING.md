# Sprint 01 — Guided On-Boarding & Project Card v2

*Target: \~1 day build + ½-day polish*

We’ll add a 3-step “Create your first project” wizard and replace the old
card with a leaner screenshot-ready version.

---

## Phase 1.1 · DB & Types   ☐

| Goal  | Add `CodingPlatform` enum + `thumbUrl` |
| ----- | -------------------------------------- |
| Files | prisma/schema.prisma, lib/types.ts     |

1. ```prisma
   enum CodingPlatform {
     CURSOR WINDSURF REPLIT MANUS OPENAI_CANVAS ANTHROPIC_CONSOLE OTHER
   }
   model Project {
     id          String   @id @default(uuid())
     name        String
     description String?
     url         String?
     platform    CodingPlatform @default(CURSOR)
     repoUrl     String?
     thumbUrl    String?        // screenshot placeholder
     status      String         // draft | prep-launch | …
   }
   ```
2. `pnpm prisma migrate dev --name onboarding`

---

## Phase 1.2 · Wizard UI shell   ☐

\| Goal  | 3-step modal wizard |
\| Files | components/OnboardingWizard.tsx, hooks/useWizard.ts |
**Steps**

* shadcn `<Dialog>` full-viewport on mobile
* **Step 1** – Project Name (required, max 60) + Tagline (optional, 140)
* **Step 2** – Front-end URL (http/https, HEAD fetch for 200/301 badge)
* **Step 3** – Platform `<Select>` (enum) + GitHub repo combobox (optional)
* Progress bullets top-right, “Back / Next” buttons
* Secondary **Skip for now** on Step 2 creates draft (`url = null`)

**Tests**
RTL: open wizard → cannot advance without name → URL validation shows red badge on `ftp://bad`

---

## Phase 1.3 · API `POST /api/projects/create`   ☐

\| File | pages/api/projects/create.ts |
**Body**

```json
{
  "name": "BuildDeck.dev",
  "description": "Side-project cockpit",
  "url": "https://builddeck.dev",
  "platform": "CURSOR",
  "repoUrl": "msanchezgrice/builddeck"
}
```

Server

1. Re-validate payload
2. `createProject()` (see schema)
3. If `url` exists → `status='prep-launch'` **and** seed four default tasks

```ts
await prisma.checklistItem.createMany({
  data: [
    { title: 'Define Minimum Lovable MVP', aiHelpHint: 'mvp' },
    { title: 'Set up /landing page', aiHelpHint: 'landing' },
    { title: 'Add README badges' },
    { title: 'Push first deploy' }
  ]
});
```

Return `{ projectId, status, thumbUrl: '/images/thumb-placeholder.png' }`

Supertest: POST → 201 & row exists.

---

## Phase 1.4 · Screenshot cron placeholder   ☐

\| File | vercel/jobs/screenshot.ts |

* Loop projects where `thumbUrl IS NULL`
* Set `thumbUrl = '/images/thumb-placeholder.png'` (real capture Sprint 02)

Vitest: mock capture → row updated.

---

## Phase 1.5 · Project Card v2   ☐

\| File | components/ProjectCard.tsx |

* Remove Cost / Analytics blocks
* `<img src={thumbUrl || '/images/thumb-placeholder.png'}>` (rounded-lg, h-32)
* Under thumb: `Last commit: {timeAgo}` (prop)

RTL: renders placeholder if no thumbUrl.

---

## Phase 1.6 · Wire Wizard → Dashboard   ☐

\| File | app/projects/page.tsx |

* On success: close wizard, `mutate()` SWR list, toast “Checklist seeded 📋”.

Playwright: complete wizard → card visible in grid.

---

## Phase 1.7 · Polish & a11y   ☐

* Escape closes wizard
* Auto-focus first input each step
* Analytics events:
  `onboarding_started`, `onboarding_completed {status, hasRepo}`, `project_created {projectId}`

---

### Validation regex snippets

```ts
name: /^(?=.{1,60}).+$/;
url : value => {
  try { const u=new URL(value); return ['http:','https:'].includes(u.protocol); } catch {return false;}
}
repo: /^[\w-]+\/[\w.-]+$/   // owner/repo
```

### Branch workflow

```bash
git checkout -b onboarding/1.1-db
# code + tests
git push && PR → merge
git checkout -b onboarding/1.2-wizard
# …repeat phases…
```

When all seven boxes are green you’ll have:

* a smooth first-project wizard,
* cleaned-up project cards with screenshot hooks,
* seeded checklist for the Virtual Cofounder.

Happy shipping! 🚀
