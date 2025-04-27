# Sprint 02 – Public-Ready Polish  
_(Landing page • Brand styling • Thumbnails • Self-serve integrations)_

We keep the same rhythm as Sprint 01: **one branch per phase ➜ PR ➜ merge after tests pass**.  
Each phase ends with acceptance tests (some automated, some manual) so Cursor can “green-light” before moving on.

---

## Phase L1 – Marketing Landing Page

|   |   |
|---|---|
| **Goal** | Signed-out users hit a marketing page (`/`) with hero, features, and **“Sign in with GitHub”** CTA. |
| **Files to create / edit** |<br>• `app/(marketing)/layout.tsx` – minimalist header/footer.<br>• `app/(marketing)/page.tsx` – hero section + 3-step “How it works” grid (Tailwind + shadcn `<Card>`).<br>• `app/(protected)/layout.tsx` – wrap existing dashboard, only accessible when `useSession()` is truthy.<br>• `middleware.ts` – route signed-in users from `/` ➜ `/dashboard`.<br>• `public/og-landing.png` – hero illustration (optional). |
| **Tests** | 1. **Playwright** `e2e/landing.spec.ts`<br>&nbsp;&nbsp;a. Visit `/` (not logged in) ⇒ see “Sign in with GitHub”.<br>&nbsp;&nbsp;b. Click CTA ⇒ URL begins `/api/auth/signin`.<br>2. **Manual**: After login, navigating back to `/` redirects to `/dashboard`. |
| **Done when** | Tests pass locally; branch merged into `main`; GitHub Actions CI green. |

---

## Phase L2 – Brand Theme & Dark-Mode

|   |   |
|---|---|
| **Goal** | Establish a simple design-system: primary colour, grey scale, dark-mode toggle. |
| **Tasks** |<br>• **Tailwind** `tailwind.config.ts`: add `colors.primary`, `colors.background`, etc.<br>• Create `components/ui/ThemeToggle.tsx` (uses `next-themes`).<br>• Swap shadcn default button to use `bg-primary`. |
| **Tests** | 1. **RTL / Jest** `ThemeToggle.test.tsx` – clicking switch toggles `class="dark"` on `<html>`.  <br>2. **Manual**: Dark-mode persists after page refresh. |
| **Done when** | Navbar shows logo + theme toggle; visual brand no longer looks like vanilla Next.js. |

---

## Phase L3 – Thumbnail / Favicon Fetcher

|   |   |
|---|---|
| **Goal** | Each project card displays a 64 × 64 thumbnail (favicon or screenshot) next to its title. |
| **Backend Changes** |<br>• **Prisma**: add `thumbnailUrl String?` to `Project` + migration.<br>• Scheduled function `thumbnail-collector.ts` (`0 2 * * *`) loops projects w/ `frontendUrl`, fetches:<br>&nbsp;&nbsp;a. try `https://www.google.com/s2/favicons?sz=64&domain_url={url}`.<br>&nbsp;&nbsp;b. else hit `https://image.thum.io/get/og/{url}`.<br>&nbsp;&nbsp;c. `prisma.project.update({ thumbnailUrl })`. |
| **Frontend** | In `ProjectCard.tsx` render `<Image src={thumbnailUrl ?? '/default-icon.svg'} …/>`. |
| **Tests** | 1. **Unit** `thumbnailCollector.test.ts` – mock fetch, expect correct URL stored.<br>2. **Manual**: Run collector locally (`curl POST /api/cron/thumbnail`) then reload dashboard → images appear. |
| **Done when** | Dashboard visually shows thumbnails for at least one real project; CI passes. |

---

## Phase L4 – “Connect GitHub & Vercel” Wizard

|   |   |
|---|---|
| **Goal** | Replace manual Prisma edits: user can attach a repo & Vercel project from the UI; IDs saved on `Project`. |
| **Schema Update** |<br>• `Repository.gitRepoId` already exists – ensure nullable.<br>• `Project.vercelProjectId String?` (if not present). |
| **Frontend** |<br>• New route `app/projects/[id]/settings.tsx` – modal with two sections:<br>&nbsp;&nbsp;**GitHub** – “Connect” button → hits `/api/github/repos` to list repos via stored OAuth token; user picks one, we save `{owner/repo, repoId}`.<br>&nbsp;&nbsp;**Vercel** – “Connect” button → call `/api/vercel/projects`; pick one → save `vercelProjectId`.<br>• Show ✓ when linked; disable button. |
| **API Routes** | `/api/github/repos` & `/api/vercel/projects` – server-side fetch using user’s stored tokens; return JSON list `{id, name}`. |
| **Tests** | 1. **Vitest** mocks GitHub API → expect `/api/github/repos` returns array.<br>2. **Playwright** `e2e/connect.spec.ts` – open settings, link fake repo (mock fetch), save → value visible on card without page reload. |
| **Done when** | For a real project you can click **Connect**, choose repo & Vercel project, and after next nightly cron the card populates commit & cost data. |

---

## How to work (repeatable loop)

1. **`git checkout -b phase-Lx`**  
2. Implement tasks – use Cursor’s *Generate Code* / *Refactor* helpers.  
3. **`pnpm test`** + run Playwright (`pnpm exec playwright test`).  
4. **Commit** ➜ `git push origin phase-Lx` ➜ open PR.  
5. CI passes → merge.  
6. Go to next phase.

Happy shipping! ✨