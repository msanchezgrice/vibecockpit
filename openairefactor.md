# OpenAI API Migration Plan: Completions → Responses

## Overview
This document outlines the step-by-step migration from OpenAI's `chat.completions` API to the new `responses` API, ensuring each phase can be validated and deployed incrementally.

## Phase 1: Core Library Update

### Implementation
1. Update the OpenAI client in `src/lib/openai.ts`
2. Ensure compatibility with both APIs during transition

```typescript
// src/lib/openai.ts
import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn('\n===== WARNING =====\nOPENAI_API_KEY environment variable is not set.\nAI features will not work without it.\nPlease add it to your .env file or environment variables.\n===================');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to determine if Responses API is available
// Can be used for feature flagging during transition
export function supportsResponsesApi() {
  return typeof openai.responses !== 'undefined';
}

// Optional test function
export async function testOpenAIConnection() {
  if (!openai.apiKey) return false;
  try {
    await openai.models.list();
    console.log('OpenAI connection successful.');
    return true;
  } catch (error) {
    console.error('OpenAI connection failed:', error);
    return false;
  }
}
```

### Validation Steps
1. Verify the openai package is up-to-date with the latest version:
   ```bash
   npm list openai
   # Should show openai@^4.x.x with Responses API support
   ```

2. Create and run a test script to verify the client works:
   ```bash
   # test-openai.js
   const { openai, supportsResponsesApi } = require('./src/lib/openai');
   
   async function test() {
     console.log(`Responses API supported: ${supportsResponsesApi()}`);
     console.log('Connection test:', await testOpenAIConnection());
   }
   
   test();
   ```

3. Expected outcome: Both checks should return `true`

## Phase 2: Task Draft Endpoint Migration

### Implementation
1. Update the task draft endpoint in `src/pages/api/ai/tasks/[id]/draft.ts`:

```typescript
// Update the OpenAI call from:
const response = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: prompt }],
  tools: [generateCopySchema, generateImageSchema],
  tool_choice: "auto",
});

// To:
const response = await openai.responses.chat({
  model: 'o3', // o3 is the appropriate model for responses API
  messages: [{ role: 'user', content: prompt }],
  tools: [generateCopySchema, generateImageSchema],
  tool_choice: "auto",
});

// Update the response parsing logic as needed:
const choice = response.choices[0];
// Continue with existing logic for handling tool calls...
```

2. Adapt the response parsing as needed

### Validation Steps
1. Unit test: Create or update tests to verify endpoint behavior
   ```bash
   # Run tests for the draft endpoint
   npm test -- -t "Task draft endpoint"
   ```

2. Manual API test:
   ```bash
   curl -X POST http://localhost:3000/api/ai/tasks/[TASK_ID]/draft \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [TOKEN]"
   ```
   
3. Verify database records:
   ```sql
   -- Run in database client
   SELECT id, title, ai_help_hint, ai_image_prompt 
   FROM checklist_items 
   WHERE id = '[TASK_ID]';
   ```

4. Expected outcomes:
   - API should return 200 response
   - Database should show updated `ai_help_hint` or `ai_image_prompt`
   - Logs should show successful OpenAI response

## Phase 3: Launch Checklist Edge Function Migration

### Implementation
1. Update the edge function in `supabase/functions/launch-checklist/index.ts`:

```typescript
// Update the OpenAI call from:
const rsp = await openai.chat.completions.create({
  model: 'o3-2025-04-16',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  tools: [fnSchema],
  tool_choice: { type: 'function', function: { name: 'recommend_next_tasks' } },
});

// To:
const rsp = await openai.responses.chat({
  model: 'o3',
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ],
  tools: [fnSchema],
  tool_choice: { type: 'function', function: { name: 'recommend_next_tasks' } },
});

// Update the response parsing logic as needed
```

2. Test locally with Supabase CLI

### Validation Steps
1. Local function testing:
   ```bash
   # Start Supabase locally
   supabase start
   
   # Test the function with a payload
   curl -X POST 'http://localhost:54321/functions/v1/launch-checklist' \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [SUPABASE_JWT]" \
     -d '{"project_id": "[TEST_PROJECT_ID]"}'
   ```

2. Verify database records:
   ```sql
   -- Run in Supabase dashboard or psql
   SELECT id, title, ai_help_hint
   FROM checklist_items
   WHERE project_id = '[TEST_PROJECT_ID]'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. Expected outcomes:
   - Function should return a success response
   - 5+ new checklist items should be created in the database
   - Items should have valid titles and reasoning in `ai_help_hint`

## Phase 4: Model & Parameter Optimization

### Implementation
1. Update model parameters for best results with Responses API
2. Fine-tune prompts if needed
3. Update any hardcoded model names

```typescript
// Example optimizations:
// 1. Update model names:
model: 'o3',  // Best for responses API

// 2. Add additional parameters if beneficial:
temperature: 0.7,  // Add if needed for creativity control
max_tokens: 1000,  // Add if needed for response length control

// 3. Optimize tool schemas for better responses
```

### Validation Steps
1. Run a benchmark test comparing old vs new results:
   ```bash
   # Create a simple benchmark script that calls both APIs and compares results
   node scripts/benchmark-openai-apis.js
   ```

2. Manual quality check:
   - Submit identical prompts to both APIs
   - Compare response quality, consistency and speed
   - Document improvements or regressions

3. Expected outcomes:
   - Response quality should be equal or better
   - Response speed should be improved
   - Tool usage should be more reliable

## Phase 5: Cleanup & Final Testing

### Implementation
1. Remove any fallback code or compatibility layers
2. Update documentation and code comments
3. Ensure consistent API usage across codebase

### Validation Steps
1. End-to-end testing:
   - Create new project with `prep_launch` status
   - Verify checklist generation
   - Test task drafting for several tasks
   - Complete full user journey

2. Code quality checks:
   ```bash
   # Run linting
   npm run lint
   
   # Run all tests
   npm test
   ```

3. Performance validation:
   - Monitor response times in logs
   - Check API usage in OpenAI dashboard
   - Verify costs align with expectations

4. Expected outcomes:
   - All user flows work seamlessly
   - Code is clean with no deprecated calls
   - API usage metrics show expected patterns

## Rollback Plan

In case of issues at any phase:

1. Revert the specific git commit for that phase
2. Temporarily add feature flag to switch between APIs if needed:
   ```typescript
   const useResponsesApi = process.env.USE_RESPONSES_API === 'true';
   
   if (useResponsesApi) {
     // Responses API code
   } else {
     // Completions API code
   }
   ```
3. Document specific issues encountered for future reference 