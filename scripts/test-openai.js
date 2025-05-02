const { openai, supportsResponsesApi, testOpenAIConnection } = require('../src/lib/openai');

async function test() {
  console.log(`Responses API supported: ${supportsResponsesApi()}`);
  console.log('Connection test:', await testOpenAIConnection());
}

test(); 