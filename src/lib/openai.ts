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

// Helper function to determine if Responses API is available
// Can be used for feature flagging during transition
export function supportsResponsesApi() {
  return typeof openai.responses !== 'undefined';
}

// Define TypeScript interfaces for Responses API
interface ResponsesAPITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: string;
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

interface ResponsesAPIOptions {
  input: string;
  instructions?: string;
  tools?: ResponsesAPITool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  model?: string;
}

// Helper function to safely call the Responses API
export async function callResponsesApi(options: ResponsesAPIOptions) {
  if (!supportsResponsesApi()) {
    throw new Error('Responses API is not supported in this version of the OpenAI SDK');
  }
  
  try {
    // We use a more specific type cast with our interfaces
    const api = openai.responses as {
      create: (params: {
        model: string;
        input: string;
        instructions?: string;
        tools?: ResponsesAPITool[];
        tool_choice?: ResponsesAPIOptions['toolChoice'];
      }) => Promise<{
        tool_calls?: Array<{ function: { name: string; arguments: string } }>;
        output_text?: string;
      }>;
    };
    
    return await api.create({
      model: options.model || 'o3',
      input: options.input,
      instructions: options.instructions,
      tools: options.tools,
      tool_choice: options.toolChoice
    });
  } catch (error) {
    console.error('Error calling Responses API:', error);
    throw error;
  }
}

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