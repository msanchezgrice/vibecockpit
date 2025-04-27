## Phase AI-0 · Environment & SDK bootstrap   ☐

| Goal | Add OpenAI o3 Responses client + types once. |
|------|---------------------------------------------|
| Files | `lib/openai.ts` |
| Tasks | 1. `pnpm add openai@^4` (SDK with `responses.*`).<br>2. `lib/openai.ts` exports `export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });` |
| Tests | `expect(openai).toBeDefined()` (sanity). |

---

## Phase AI-1 · Checklist Generator EdgeFn   ☐

*Triggered by `status = "prep-launch"`.*

| Step | Details |
|------|---------|
| 1 | **SQL trigger** (`sql/launch_trigger.sql`) – identical to snippet already provided. |
| 2 | **Edge Function** `supabase/functions/launch-checklist.ts` :<br>```ts\nconst fnSchema = {\n  name: 'generate_launch_checklist',\n  description: 'Return tasks JSON',\n  parameters: {\n    type: 'object',\n    properties: {\n      tasks: { type: 'array', items: { type:'object', properties:{ title:{type:'string'}, description:{type:'string'}, ai_help_hint:{type:'string'} }, required:['title'] } }\n    },\n    required:['tasks']\n  }\n};\n\nconst rsp = await openai.responses.chat({\n  model: 'o3',\n  messages: [{ role:'user', content:`Generate a 10-step launch checklist for a ${category} SaaS product.` }],\n  tools: [fnSchema],\n  tool_choice: { type:'function', name:'generate_launch_checklist' }\n});\nconst tasks = JSON.parse(rsp.choices[0].message.function_call!.arguments).tasks;\n``` |
| 3 | `INSERT` rows into `checklist_item`. |
| Unit test | Mock OpenAI with `nock` → assert 10 rows. |

---

## Phase AI-2 · Ask-AI Draft Route   ☐

| Endpoint | `POST /api/ai/tasks/:id/draft` |
|----------|--------------------------------|
| Function schemas | **generate_copy** – returns `{copy:string}`<br>**generate_image** – returns `{image_prompt:string}` (model = DALL·E-3 via `image_gen.text2im`, aspect `1200x630`). |
| Flow | 1. Fetch task row.<br>2. Build prompt: “Write a ${task.title} for *${project.name}* …”.<br>3. Call `openai.responses.chat` with both tools available (model `o3`).<br>4. Store `ai_draft`, `ai_image_prompt` in DB. |
| Test | Supertest POST returns 200 and row `ai_draft` not null. |

---

## Phase AI-3 · Accept / Regenerate / Toggle   ☐

| Accept | `POST /api/ai/tasks/:id/accept`  → moves `ai_draft` → `final_content`, sets `status='in_progress'`. |
| Regen  | `POST /api/ai/tasks/:id/regenerate` → re-invokes Phase AI-2 route. |
| Toggle | `PATCH /api/ai/tasks/:id` body `{ done:true }` → marks checkbox. |
| Tests  | Vitest: after Accept, `final_content` matches previous draft. |

---

## Phase AI-4 · Nightly Auditor Cron   ☐

| File | `vercel/jobs/auditor.ts` (schedule: `0 3 * * *`) |
| Logic | 1. `SELECT project_id, count(*) FROM checklist_item WHERE status!='done' AND created_at < NOW() - INTERVAL '3 days' GROUP BY 1`<br>2. For any rows, POST Slack webhook: “⚠️ *${project}* has ${cnt} overdue tasks.” |
| Test | Mock Supabase client & webhook URL → expect fetch payload shape. |

---

### Cost guard-rails

* Checklist generation ≈ **0.04 $** (1.5k tokens)  
* Each **Ask-AI** copy draft ≈ **0.02 $**; image call adds **0.04 $**  
* Cron auditor tiny (<0.01 $)

Add usage caps in OpenAI dashboard.

---

**End of Finisher-Agent tasks** – check each box in Cursor as you go.  
When Phase AI-3 is merged, the UI buttons will hit real endpoints; when AI-4 is merged, you’ll get Slack nudges nightly.

Happy coding!