// scripts/test-openai.ts
import { openai, supportsResponsesApi, testOpenAIConnection } from '../src/lib/openai';

async function test() {
  console.log(`Responses API supported: ${supportsResponsesApi()}`);
  console.log('Connection test:', await testOpenAIConnection());
}

test(); 