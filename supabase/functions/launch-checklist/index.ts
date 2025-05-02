// import { serve } from "jsr:@std/http";
import { OpenAI } from "npm:openai@^4"; // Import OpenAI SDK
import { createClient } from 'npm:@supabase/supabase-js@2'; // Import Supabase client
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


    // --- Construct New OpenAI Prompt ---
    const systemPrompt = "You are a seasoned startup cofounder, best in class at all aspects of designing, launching, and fundraising for a startup. Your goal is to provide highly relevant and actionable recommendations.";
    const userPrompt = `
Analyze the following project information for a project currently in the 'prep_launch' status:
- Name: ${projectData.name}
- Description: ${projectData.description || 'Not provided'}
- Website URL: ${projectData.frontendUrl || 'Not provided'}
- GitHub Repo: ${projectData.githubRepo || 'Not provided'}

Based on your expertise and the project details, analyze the situation and recommend the 5 most crucial and helpful next tasks to ensure a successful launch. For each task, provide a concise title and brief reasoning explaining its importance at this stage.
    `.trim();
    // --- End Construct New OpenAI Prompt ---

    let tasks: RecommendedTaskData[] = [];

    // Check if Responses API is supported
    if (supportsResponsesApi()) {
      try {
        console.log("launch-checklist: Using Responses API");
        
        // 1. Call OpenAI with Responses API
        const response = await openai.chat.completions.create({
          model: 'o3', // Updated model name for Responses API
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          tools: [fnSchema],
          tool_choice: { type: 'function', function: { name: 'recommend_next_tasks' } },
        });

        // 2. Parse Response (keep using the existing format for now)
        const choice = response.choices[0];
        const functionCall = choice.message?.tool_calls?.[0]?.function;

        if (!functionCall?.arguments) {
          console.error("OpenAI response missing function call arguments:", response);
          throw new Error('Failed to parse recommendations from OpenAI response.');
        }

        console.log("launch-checklist: Raw OpenAI arguments for", project_id, ":", functionCall.arguments);
        let parsedTasks: { tasks: RecommendedTaskData[] };
        try {
          parsedTasks = JSON.parse(functionCall.arguments);
        } catch (parseError) {
          console.error("Failed to parse OpenAI JSON:", parseError, "Raw args:", functionCall.arguments);
          throw new Error("Invalid JSON format received from OpenAI.");
        }

        tasks = parsedTasks.tasks;

      } catch (error) {
        console.warn("launch-checklist: Error using Responses API, falling back to Chat Completions:", error);
        // Let it fall through to the fallback implementation
      }
    }

    // Fallback to Chat Completions API if Responses API failed or is not available
    if (tasks.length === 0) {
      console.log("launch-checklist: Using Chat Completions API");
      
      // 1. Call OpenAI with new prompt and schema
      console.log("launch-checklist: Sending request to OpenAI for", project_id);
      const rsp = await openai.chat.completions.create({
        model: 'o3-2025-04-16', // Updated model to o3-2025-04-16
        messages: [
          { role: 'system', content: systemPrompt }, 
          { role: 'user', content: userPrompt }
        ],
        tools: [fnSchema],
        tool_choice: { type:'function', function: { name: 'recommend_next_tasks' } },
      });

      // 2. Parse Response
      const choice = rsp.choices[0];
      const functionCall = choice.message?.tool_calls?.[0]?.function;

      if (!functionCall?.arguments) {
        console.error("OpenAI response missing function call arguments:", rsp);
        throw new Error('Failed to parse recommendations from OpenAI response.');
      }

      console.log("launch-checklist: Raw OpenAI arguments for", project_id, ":", functionCall.arguments);
      let parsedTasks: { tasks: RecommendedTaskData[] };
      try {
         parsedTasks = JSON.parse(functionCall.arguments);
      } catch (parseError) {
          console.error("Failed to parse OpenAI JSON:", parseError, "Raw args:", functionCall.arguments);
          throw new Error("Invalid JSON format received from OpenAI.");
      }

      tasks = parsedTasks.tasks;
    }

    console.log(`launch-checklist: Received ${tasks.length} recommended tasks for ${project_id}.`);

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
    return new Response(JSON.stringify({ success: true, count: insertedData?.length ?? 0 }), {
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