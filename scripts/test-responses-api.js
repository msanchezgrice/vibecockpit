// scripts/test-responses-api.js
require('dotenv').config();
const { openai, supportsResponsesApi, callResponsesApi } = require('../src/lib/openai');

/**
 * Test script for OpenAI API integration
 * Tests both Completions API and Responses API (if available)
 */

// Tool schema for testing
const testToolSchema = {
  type: 'function',
  function: {
    name: 'get_project_information',
    description: 'Get information about a project',
    parameters: {
      type: 'object',
      properties: { 
        name: { type: 'string', description: 'The name of the project' },
        description: { type: 'string', description: 'Brief description of the project' }
      },
      required: ['name']
    }
  }
};

async function testCompletionsAPI() {
  console.log('\n🔍 Testing Chat Completions API...');
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Generate a name for a project management tool' }],
      tools: [testToolSchema],
      tool_choice: "auto",
    });
    
    console.log('✅ Chat Completions API response:');
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        console.log(`Tool used: ${toolCall.function.name}`);
        console.log(`Arguments: ${toolCall.function.arguments}`);
      } else if (choice.message?.content) {
        console.log(`Content: ${choice.message.content.substring(0, 100)}...`);
      }
    }
    return true;
  } catch (error) {
    console.error('❌ Chat Completions API failed:', error.message);
    return false;
  }
}

async function testResponsesAPI() {
  console.log('\n🔍 Testing Responses API...');
  
  if (!supportsResponsesApi()) {
    console.log('⚠️ Responses API not supported in this version of the OpenAI SDK');
    return false;
  }
  
  try {
    const response = await callResponsesApi({
      model: 'o3',
      input: 'Generate a name for a project management tool',
      tools: [testToolSchema],
      toolChoice: "auto",
    });
    
    console.log('✅ Responses API response:');
    
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];
      console.log(`Tool used: ${toolCall.function.name}`);
      console.log(`Arguments: ${toolCall.function.arguments}`);
    } else if (response.output_text) {
      console.log(`Content: ${response.output_text.substring(0, 100)}...`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Responses API failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting OpenAI API Tests');
  console.log('===========================');
  
  console.log(`Responses API available: ${supportsResponsesApi() ? 'Yes' : 'No'}`);
  
  const completionsSuccess = await testCompletionsAPI();
  let responsesSuccess = false;
  
  if (supportsResponsesApi()) {
    responsesSuccess = await testResponsesAPI();
  }
  
  console.log('\n📊 Test Summary:');
  console.log('===========================');
  console.log(`Chat Completions API: ${completionsSuccess ? '✅ Passed' : '❌ Failed'}`);
  console.log(`Responses API: ${!supportsResponsesApi() ? '⚠️ Not Available' : (responsesSuccess ? '✅ Passed' : '❌ Failed')}`);
}

runTests().catch(console.error); 