const OpenAI = require('openai');

// Create a client without API key just to check API structure
const openai = new OpenAI({ apiKey: 'dummy-key-for-inspection-only' });

// Check if responses API exists
const hasResponsesApi = typeof openai.responses !== 'undefined';
console.log(`OpenAI SDK version: ${require('openai/package.json').version}`);
console.log(`Responses API supported: ${hasResponsesApi}`);

// List available properties on the client for verification
console.log('\nAvailable top-level properties on OpenAI client:');
console.log(Object.keys(openai).sort().join(', ')); 