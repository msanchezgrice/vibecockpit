import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  // Log an error or throw if the key is essential for the app to start
  // For now, we log a warning, assuming it might only be needed for specific features.
  console.warn(
    '\n===== WARNING =====\nOPENAI_API_KEY environment variable is not set.\nAI features will not work without it.\nPlease add it to your .env file or environment variables.\n==================='
  );
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Other options like organization ID can be added here if needed
});

// Optional: Add a simple function to test connectivity (can be removed later)
export async function testOpenAIConnection() {
  if (!openai.apiKey) return false;
  try {
    await openai.models.list(); // Simple, low-cost API call
    console.log('OpenAI connection successful.');
    return true;
  } catch (error) {
    console.error('OpenAI connection failed:', error);
    return false;
  }
} 