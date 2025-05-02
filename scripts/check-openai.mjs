// scripts/check-openai.mjs
import OpenAI from 'openai';

// Create a client with a dummy key
const openai = new OpenAI({ apiKey: 'dummy-key-for-inspection-only' });
 
// Check if responses API exists
console.log('OpenAI client initialized');
console.log('Available APIs:', Object.keys(openai));
console.log('Has responses API:', openai.responses !== undefined); 