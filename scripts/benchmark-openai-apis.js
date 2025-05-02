const { openai } = require('../src/lib/openai');

/**
 * Benchmark script to compare OpenAI Chat Completions API with Responses API
 * 
 * This script measures performance and response quality between the two APIs.
 */

const TEST_PROMPTS = [
  "Write a short marketing tagline for a project management tool that focuses on simplicity.",
  "Generate 3 names for a startup that helps businesses automate customer support.",
  "Summarize the key benefits of cloud computing for a small business in 3 bullet points.",
  "Create a short social media post announcing a new feature that lets users collaborate in real-time."
];

const TOOL_SCHEMA = {
  type: 'function',
  function: {
    name: 'generate_content',
    description: 'Generate marketing content based on the prompt.',
    parameters: {
      type: 'object',
      properties: { 
        content: { type: 'string', description: 'The generated marketing content.' } 
      },
      required: ['content']
    }
  }
};

async function runCompletionsAPI(prompt) {
  console.time(`Completions API - Prompt ${TEST_PROMPTS.indexOf(prompt) + 1}`);
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      tools: [TOOL_SCHEMA],
      tool_choice: "auto",
    });
    console.timeEnd(`Completions API - Prompt ${TEST_PROMPTS.indexOf(prompt) + 1}`);
    
    // Process response based on format
    let content = '';
    const choice = response.choices[0];
    
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
      content = functionArgs.content || '';
    } else if (choice.message?.content) {
      content = choice.message.content;
    }
    
    return { 
      content,
      tokens: response.usage?.total_tokens || 0,
      model: response.model,
      time: 0 // Will be filled by the timer
    };
  } catch (error) {
    console.error(`Error with Completions API: ${error.message}`);
    console.timeEnd(`Completions API - Prompt ${TEST_PROMPTS.indexOf(prompt) + 1}`);
    return { content: '', tokens: 0, model: '', time: 0, error: error.message };
  }
}

async function runResponsesAPI(prompt) {
  // Check if Responses API is supported
  if (typeof openai.responses === 'undefined') {
    return { content: '', tokens: 0, model: '', time: 0, error: 'Responses API not supported' };
  }
  
  console.time(`Responses API - Prompt ${TEST_PROMPTS.indexOf(prompt) + 1}`);
  try {
    const response = await openai.responses.create({
      model: 'o3',
      input: prompt,
      tools: [TOOL_SCHEMA],
      tool_choice: "auto",
    });
    console.timeEnd(`Responses API - Prompt ${TEST_PROMPTS.indexOf(prompt) + 1}`);
    
    // Process responses API response format
    let content = '';
    
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
      content = functionArgs.content || '';
    } else if (response.output_text) {
      content = response.output_text;
    }
    
    return { 
      content,
      tokens: response.usage?.input_tokens + response.usage?.output_tokens || 0,
      model: response.model || 'o3',
      time: 0 // Will be filled by the timer
    };
  } catch (error) {
    console.error(`Error with Responses API: ${error.message}`);
    console.timeEnd(`Responses API - Prompt ${TEST_PROMPTS.indexOf(prompt) + 1}`);
    return { content: '', tokens: 0, model: '', time: 0, error: error.message };
  }
}

async function runBenchmark() {
  console.log('🚀 Starting OpenAI API Benchmark');
  console.log('=================================');
  
  const results = [];
  
  for (const prompt of TEST_PROMPTS) {
    console.log(`\n📝 Testing prompt: "${prompt.substring(0, 40)}..."`);
    
    // Run both APIs
    const completionsResult = await runCompletionsAPI(prompt);
    const responsesResult = await runResponsesAPI(prompt);
    
    results.push({
      prompt,
      completions: completionsResult,
      responses: responsesResult
    });
    
    // Display results for this prompt
    console.log('\n📊 Results:');
    console.log(`- Completions API: ${completionsResult.error ? 'ERROR: ' + completionsResult.error : completionsResult.content.substring(0, 60) + '...'}`);
    console.log(`- Responses API: ${responsesResult.error ? 'ERROR: ' + responsesResult.error : responsesResult.content.substring(0, 60) + '...'}`);
  }
  
  // Print summary
  console.log('\n📈 Benchmark Summary:');
  console.log('=================================');
  
  // Calculate averages
  const completionsErrors = results.filter(r => r.completions.error).length;
  const responsesErrors = results.filter(r => r.responses.error).length;
  
  console.log(`Completions API: ${completionsErrors} errors out of ${TEST_PROMPTS.length} prompts`);
  console.log(`Responses API: ${responsesErrors} errors out of ${TEST_PROMPTS.length} prompts`);
  
  console.log('\n✅ Benchmark Completed');
}

runBenchmark().catch(console.error); 