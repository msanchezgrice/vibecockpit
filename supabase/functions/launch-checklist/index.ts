// import { serve } from "jsr:@std/http";
import { OpenAI } from "npm:openai@^4"; // Import OpenAI SDK
import { createClient } from 'npm:@supabase/supabase-js@2'; // Import Supabase client
import { analyzeWebsite, analyzeGitHubRepo } from './content-analyzer.ts'; // Import content analyzer
// import { corsHeaders } from '../_shared/cors.ts'; // Removed incorrect import

// Define standard CORS headers directly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("launch-checklist: Top-level script executing..."); // Log script start

// Initialize OpenAI Client
let openai;
try {
  openai = new OpenAI({ // Initialize inside try-catch
    apiKey: Deno.env.get("OPENAI_API_KEY"),
  });
  console.log("launch-checklist: OpenAI client initialized."); // Log success
} catch (error) {
  console.error("launch-checklist: FAILED to initialize OpenAI client:", error);
  // Optionally, throw the error again if initialization is critical
  // throw error;
}

// Function to check if the Responses API is supported
function supportsResponsesApi() {
  return typeof openai?.responses !== 'undefined';
}

// Define interfaces for API responses
interface ResponsesAPIOptions {
  model?: string;
  input: string;
  instructions?: string;
  tools?: any[];
  toolChoice?: any;
}

interface ResponsesApiFormat {
  tool_calls?: Array<{ function: { name: string; arguments: string } }>;
  output_text?: string;
}

// Type guard to check if the response is from Responses API
function isResponsesApiFormat(response: unknown): response is ResponsesApiFormat {
  if (!response || typeof response !== 'object') return false;
  const resp = response as Record<string, unknown>;
  return ('tool_calls' in resp || 'output_text' in resp);
}

// Safe wrapper to call the Responses API
async function callResponsesApi(options: ResponsesAPIOptions) {
  if (!supportsResponsesApi()) {
    throw new Error('Responses API not supported');
  }
  
  try {
    // Use proper typing for the API
    const api = openai.responses;
    
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

// Define the expected OpenAI function call schema for task recommendation
const fnSchema = {
  type: 'function' as const, // Add type assertion
  function: {
      name: 'recommend_next_tasks', // Changed name
      description: 'Recommend the 5 most relevant next tasks for a project preparing to launch.', // Changed description
      parameters: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            description: 'List of ~5 recommended next tasks.', // Changed description
            items: {
                type:'object',
                properties:{
                    title:{ type:'string', description: 'Concise title of the recommended task.' }, // Kept title
                    reasoning:{ type:'string', description: 'Brief reasoning for why this task is recommended now.' } // Added reasoning
                },
                required:['title', 'reasoning'] // Made reasoning required
            }
          }
        },
        required:['tasks']
      }
  }
};

interface RecommendedTaskData { // Renamed interface
    title: string;
    reasoning: string; // Changed field
}

Deno.serve(async (req) => {
  console.log('launch-checklist: Request received.'); // Existing log
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let supabaseAdmin; // Declare outside try block
  try {
    console.log('launch-checklist: Entering main try block.'); // Log entering try

    // Initialize Supabase client
    try { // Nested try-catch for Supabase client
       supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
          { auth: { persistSession: false } }
      );
      console.log("launch-checklist: Supabase client initialized."); // Log success
    } catch (error) {
        console.error("launch-checklist: FAILED to initialize Supabase client:", error);
        throw error; // Re-throw to be caught by outer catch
    }

    const { project_id } = await req.json();
    console.log(`launch-checklist: Parsed project_id: ${project_id}`); // Log after parsing

    if (!project_id) {
        throw new Error("Missing project_id in request body");
    }

    // --- Fetch Project Details ---
    const { data: projectData, error: projectError } = await supabaseAdmin
        .from('Project') // Use the actual table name (check casing if needed)
        .select('name, description, frontendUrl:frontend_url, githubRepo:github_repo, status') // Select necessary fields, mapping snake_case
        .eq('id', project_id)
        .single(); // Expect only one project

    if (projectError) {
        console.error("Supabase project fetch error:", projectError);
        throw new Error(`Database error fetching project details: ${projectError.message}`);
    }
    if (!projectData) {
        throw new Error(`Project with ID ${project_id} not found.`);
    }
    console.log("launch-checklist: Fetched project data for", project_id);
    // --- End Fetch Project Details ---

    // --- Analyze External Content ---
    console.log("launch-checklist: Starting content analysis");
    
    // Analyze website if URL is provided
    let websiteAnalysis = "No website URL provided";
    if (projectData.frontendUrl) {
      try {
        console.log(`launch-checklist: Analyzing website: ${projectData.frontendUrl}`);
        websiteAnalysis = await analyzeWebsite(projectData.frontendUrl);
      } catch (error) {
        console.error("Website analysis error:", error);
        websiteAnalysis = `Website analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
    
    // Analyze GitHub repo if URL is provided
    let githubAnalysis = "No GitHub repository URL provided";
    if (projectData.githubRepo) {
      try {
        console.log(`launch-checklist: Analyzing GitHub repo: ${projectData.githubRepo}`);
        githubAnalysis = await analyzeGitHubRepo(projectData.githubRepo);
      } catch (error) {
        console.error("GitHub analysis error:", error);
        githubAnalysis = `GitHub analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
    
    console.log("launch-checklist: Content analysis complete");
    // --- End Analyze External Content ---

    // --- Construct New OpenAI Prompt ---
    const systemPrompt = "You are a seasoned startup cofounder, best in class at all aspects of designing, launching, and fundraising for a startup. Your goal is to provide highly relevant and actionable recommendations based on real-world project data.";
    const userPrompt = `
Analyze the following project information for a project currently in the 'prep_launch' status:

PROJECT DETAILS:
- Name: ${projectData.name}
- Description: ${projectData.description || 'Not provided'}
- Website URL: ${projectData.frontendUrl || 'Not provided'}
- GitHub Repo: ${projectData.githubRepo || 'Not provided'}

WEBSITE ANALYSIS:
${websiteAnalysis}

GITHUB REPOSITORY ANALYSIS:
${githubAnalysis}

Based on all of the above information, analyze the situation thoroughly and recommend the 5 most crucial and helpful next tasks to ensure a successful launch. For each task, provide a concise title and brief reasoning explaining its importance at this stage.

Your recommendations should be specific, actionable, and directly relevant to this particular project. Avoid generic advice that doesn't take into account the specific context provided.
    `.trim();
    // --- End Construct New OpenAI Prompt ---

    let tasks: RecommendedTaskData[] = [];
    let isResponsesApi = false;

    // Try to use Responses API first
    try {
      if (supportsResponsesApi()) {
        console.log("launch-checklist: Using Responses API");
        
        // Call Responses API
        const response = await callResponsesApi({
          model: 'gpt-4o-2024-11-20', // Updated model to latest version
          input: userPrompt,
          instructions: systemPrompt,
          tools: [fnSchema],
          toolChoice: { type: 'function', function: { name: 'recommend_next_tasks' } },
        });
        
        // Process Responses API result using the type guard
        if (isResponsesApiFormat(response) && response.tool_calls && response.tool_calls.length > 0) {
          const toolCall = response.tool_calls[0];
          const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          console.log("launch-checklist: Raw OpenAI arguments from Responses API for", project_id, ":", functionArgs);
          
          if (functionArgs.tasks && Array.isArray(functionArgs.tasks)) {
            tasks = functionArgs.tasks;
            isResponsesApi = true;
          }
        }
      }
    } catch (apiError) {
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
      console.warn("launch-checklist: Error using Responses API, falling back to Chat Completions:", errorMessage);
    }

    // Fallback to Chat Completions API if Responses API failed or is not available
    if (tasks.length === 0) {
      console.log("launch-checklist: Using Chat Completions API");
      
      // Call OpenAI with new prompt and schema
      console.log("launch-checklist: Sending request to OpenAI for", project_id);
      const rsp = await openai.chat.completions.create({
        model: 'gpt-4o-2024-11-20', // Updated model to latest version
        messages: [
            { role: 'system', content: systemPrompt }, 
            { role: 'user', content: userPrompt }
        ],
        tools: [fnSchema],
        tool_choice: { type:'function', function: { name: 'recommend_next_tasks' } },
      });

      // Parse Response
      const choice = rsp.choices[0];
      const functionCall = choice.message?.tool_calls?.[0]?.function;

      if (!functionCall?.arguments) {
        console.error("OpenAI response missing function call arguments:", rsp);
        throw new Error('Failed to parse recommendations from OpenAI response.');
      }

      console.log("launch-checklist: Raw OpenAI arguments from Chat Completions for", project_id, ":", functionCall.arguments);
      let parsedTasks: { tasks: RecommendedTaskData[] };
      try {
         parsedTasks = JSON.parse(functionCall.arguments);
      } catch (parseError) {
          console.error("Failed to parse OpenAI JSON:", parseError, "Raw args:", functionCall.arguments);
          throw new Error("Invalid JSON format received from OpenAI.");
      }

      tasks = parsedTasks.tasks;
    }

    console.log(`launch-checklist: Received ${tasks.length} recommended tasks for ${project_id} (using ${isResponsesApi ? 'Responses API' : 'Chat Completions API'}).`);

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw new Error("No valid tasks received from OpenAI.");
    }

    // 3. Format data for Supabase/Prisma insertion
    const checklistItemsToInsert = tasks.map((task, index) => ({
      project_id: project_id, // <-- Use snake_case 'project_id' (matches DB column)
      title: task.title,
      ai_help_hint: task.reasoning, // Map reasoning to ai_help_hint
      order: index + 1, // Simple ordering
      is_complete: false, // Default to not complete
    }));

    // 4. Insert into Database
    console.log(`launch-checklist: Attempting to insert ${checklistItemsToInsert.length} tasks for ${project_id}`);
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('checklist_items') // Use the actual table name
      .insert(checklistItemsToInsert)
      .select(); // Optionally select inserted data

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw new Error(`Database error inserting checklist items: ${insertError.message}`);
    }

    console.log(`launch-checklist: Successfully inserted ${insertedData?.length ?? 0} tasks for ${project_id}`);

    // Return success response
    return new Response(JSON.stringify({ 
      success: true, 
      count: insertedData?.length ?? 0,
      api_used: isResponsesApi ? 'responses' : 'chat_completions'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    console.error("launch-checklist: Error in main try block:", error); // Modify existing log
    const message = error instanceof Error ? error.message : 'Unknown edge function error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 