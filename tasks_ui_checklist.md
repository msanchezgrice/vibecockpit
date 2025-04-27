# Sprint 03 — Launch Checklist & Ask-AI UI
_(extends current Project Dashboard + Edit-Project modal)_

We keep your narrow cards, red sign-out button, and the existing
Frontend URL / Vercel / GitHub / Cost / Activity blocks.

---

## Phase UI-1 · Card Preview strip

| Goal | Add a compact “Launch Checklist” preview to any card whose `status = prep-launch`. |
|------|---|
| Files | `components/ProjectCard.tsx`, `components/ChecklistPreview.tsx` |
| Details | 1. Import checklist count & first 3 tasks via `useChecklist(projectId)` hook.<br>2. Insert preview **below** your “Monthly Activity” block, so old fields stay intact.<br>3. Progress bar: `div.h-2.rounded-full.bg-gray-200 > div.bg-blue-600` |
| Tests | RTL: render card with mock checklist → expect “Launch Checklist 3 / 12” text & blue bar at 25 %. |

**Done when** dashboard shows identical old layout **plus** preview strip on Prep-Launch cards.

---

## Phase UI-2 · Full Checklist modal

| Goal | Clicking **“View Full Checklist →”** opens a modal with the entire task list & progress. |
| Files | `app/projects/[id]/ChecklistModal.tsx`, `hooks/useModal.ts` |
| Details | • Modal header matches your current Edit-Project modal (white card, rounded, shadow).<br>• Task rows: checkbox, title, optional yellow “AI” chip, “Ask AI” button.<br>• Leave existing Edit-Project modal untouched. |
| Tests | Playwright: open dashboard → click “View Full Checklist” → modal visible → Esc closes. |

**Done when** modal appears and closes without breaking existing modals.

---

## Phase UI-3 · Ask-AI slide-over

| Goal | “Ask AI” on any task opens a right-hand drawer with GPT draft, Regenerate, Accept & Save. |
| Files | `components/AskAIDrawer.tsx`, update `ChecklistModal.tsx` |
| Details | • Width ≤ 24 rem on md+, full-width on mobile.<br>• Re-use Tailwind gray-50 / blue-600 tokens.<br>• On Accept, emit `onSave(draft)` back up to ChecklistModal (no backend wire-up yet). |
| Tests | RTL: click Ask-AI → drawer visible → textarea prefilled → Accept triggers callback. |

**Done when** drawer slides in/out smoothly and matches screenshot style.

---

## Phase UI-4 · Schema & API glue (optional in UI sprint)

*If you already added `checklist_item` table and API in Sprint 02, skip this phase.*

| Goal | GET `/api/checklist?projectId=` returns tasks; POST `/api/checklist/:id/ai-draft` updates `ai_help_hint`. |
| Files | `pages/api/checklist/index.ts`, `[id]/ai-draft.ts` |
| Tests | Vitest + Supertest: POST returns 200 and updates row. |

---

### Folder & style guidelines

* Keep **all existing field blocks** (`Frontend URL`, `Vercel Project`, etc.) — only *add* below them.
* Use shadcn `<Dialog>` for modal, `<Drawer>` for slide-over, or replicate via Tailwind if you prefer.
* Colors: `bg-blue-600` (primary), `bg-yellow-100` chip, neutral grays as in current design.
* Typography: keep Tailwind `text-[11px]` for labels, `text-sm` for body.

---

### How to run in Cursor

1. `git checkout -b ui/phase-1-checklist-strip`
2. Work through **Phase UI-1** tasks ⇒ `pnpm test` ⇒ commit & PR ⇒ merge.
3. Repeat for each phase; Cursor’s Tasks panel will show the new checklist.

When all four phases are green, you’ll have a coherent, upgrade-safe UI that matches your screenshots and supports the Finisher Agent workflow.

Happy shipping!