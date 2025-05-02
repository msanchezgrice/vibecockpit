const { openai } = require('../src/lib/openai');

/**
 * End-to-end test script to verify OpenAI API integration
 * 
 * This script tests:
 * 1. Basic connectivity to OpenAI
 * 2. Chat Completions API with tool calling
 * 3. Responses API if available
 */

async function testOpenAIConnection() {
  console.log('🔍 Testing OpenAI Connection...');
  try {
    await openai.models.list();
    console.log('✅ OpenAI connection successful');
    return true;
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error.message);
    return false;
  }
}

async function testChatCompletionsAPI() {
  console.log('\n🔍 Testing Chat Completions API...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello world' }],
    });
    
    const content = response.choices[0]?.message?.content;
    console.log(`✅ Chat Completions API response: "${content?.substring(0, 30)}..."`);
    return true;
  } catch (error) {
    console.error('❌ Chat Completions API failed:', error.message);
    return false;
  }
}

async function testToolCalling() {
  console.log('\n🔍 Testing Tool Calling...');
  
  const toolSchema = {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get the weather in a location',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'The city and state, e.g. San Francisco, CA' },
          unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'The unit of temperature' }
        },
        required: ['location']
      }
    }
  };
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'What\'s the weather like in San Francisco?' }],
      tools: [toolSchema],
      tool_choice: "auto",
    });
    
    const choice = response.choices[0];
    if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
      
      console.log(`✅ Tool Calling API response: Called "${functionName}" with args:`, functionArgs);
      return true;
    } else {
      console.log('⚠️ Tool Calling API didn\'t use the tool');
      return false;
    }
  } catch (error) {
    console.error('❌ Tool Calling API failed:', error.message);
    return false;
  }
}

async function testResponsesAPI() {
  console.log('\n🔍 Testing Responses API...');
  
  // Check if Responses API is supported
  if (typeof openai.responses === 'undefined') {
    console.log('⚠️ Responses API not supported in this version');
    return false;
  }
  
  try {
    const response = await openai.responses.create({
      model: 'o3',
      input: 'Say hello world',
    });
    
    const content = response.output_text;
    console.log(`✅ Responses API response: "${content?.substring(0, 30)}..."`);
    return true;
  } catch (error) {
    console.error('❌ Responses API failed:', error.message);
    return false;
  }
}

async function runE2ETests() {
  console.log('🚀 Starting OpenAI E2E Tests');
  console.log('===========================');
  
  // Run all tests
  const connectionSuccessful = await testOpenAIConnection();
  if (!connectionSuccessful) {
    console.error('❌ Connection test failed. Aborting further tests.');
    return;
  }
  
  const completionsSuccessful = await testChatCompletionsAPI();
  const toolCallingSuccessful = await testToolCalling();
  const responsesSuccessful = await testResponsesAPI();
  
  // Summary
  console.log('\n📊 E2E Test Summary:');
  console.log('===========================');
  console.log(`OpenAI Connection:    ${connectionSuccessful ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Chat Completions API: ${completionsSuccessful ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Tool Calling:         ${toolCallingSuccessful ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Responses API:        ${responsesSuccessful ? '✅ Passed' : (typeof openai.responses === 'undefined' ? '⚠️ Not Available' : '❌ Failed')}`);
  
  const allPassed = connectionSuccessful && completionsSuccessful && toolCallingSuccessful;
  const responsesStatus = typeof openai.responses === 'undefined' ? 'skipped' : (responsesSuccessful ? 'passed' : 'failed');
  
  console.log(`\n${allPassed ? '✅ All required tests passed!' : '❌ Some tests failed!'} (Responses API test ${responsesStatus})`);
}

runE2ETests().catch(console.error); 