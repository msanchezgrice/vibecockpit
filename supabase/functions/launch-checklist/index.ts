import { serve } from "jsr:@std/http";
import { OpenAI } from "npm:openai@^4"; // Import OpenAI SDK
import { createClient } from 'npm:@supabase/supabase-js@2'; // Import Supabase client
// import { corsHeaders } from '../_shared/cors.ts'; // Removed incorrect import

// Define standard CORS headers directly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log("launch-checklist function booting up...");

// Initialize OpenAI Client (ensure OPENAI_API_KEY is set in Edge Function env vars)
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

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

serve(async (req) => {
  console.log('Request received for launch-checklist');
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (ensure env vars are set)
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
    );

    const { project_id } = await req.json(); // Only expect project_id now
    console.log(`Generating task recommendations for project: ${project_id}`);

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
    console.log("Fetched project data:", projectData);
    // --- End Fetch Project Details ---


    // --- Construct New OpenAI Prompt ---
    const promptContent = `
Analyze the following project information for a project currently in the 'prep_launch' status:
- Name: ${projectData.name}
- Description: ${projectData.description || 'Not provided'}
- Website URL: ${projectData.frontendUrl || 'Not provided'}
- GitHub Repo: ${projectData.githubRepo || 'Not provided'}

Based *only* on this information, recommend the 5 most relevant and actionable next tasks to focus on for successfully launching this project. Provide a concise title and a brief reasoning for each task.
    `.trim();
    // --- End Construct New OpenAI Prompt ---


    // 1. Call OpenAI with new prompt and schema
    console.log("Sending request to OpenAI...");
    const rsp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Or 'gpt-4' if preferred
      messages: [{ role:'user', content: promptContent }], // Use the new prompt
      tools: [fnSchema], // Use the updated schema
      tool_choice: { type:'function', function: { name: 'recommend_next_tasks' } }, // Use the new function name
    });

    // 2. Parse Response
    const choice = rsp.choices[0];
    const functionCall = choice.message?.tool_calls?.[0]?.function;

    if (!functionCall?.arguments) {
      console.error("OpenAI response missing function call arguments:", rsp);
      throw new Error('Failed to parse recommendations from OpenAI response.');
    }

    console.log("Raw OpenAI arguments:", functionCall.arguments);
    let parsedTasks: { tasks: RecommendedTaskData[] }; // Use updated interface
    try {
       parsedTasks = JSON.parse(functionCall.arguments);
    } catch (parseError) {
        console.error("Failed to parse OpenAI JSON:", parseError, "Raw args:", functionCall.arguments);
        throw new Error("Invalid JSON format received from OpenAI.");
    }

    const tasks = parsedTasks.tasks;
    console.log(`Received ${tasks?.length ?? 0} recommended tasks from OpenAI.`);

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw new Error("No valid tasks received from OpenAI.");
    }

    // 3. Format data for Supabase/Prisma insertion
    const checklistItemsToInsert = tasks.map((task, index) => ({
      projectId: project_id, // Link to the project
      title: task.title,
      ai_help_hint: task.reasoning, // Map reasoning to ai_help_hint
      order: index + 1, // Simple ordering
      is_complete: false, // Default to not complete
    }));

    // 4. Insert into Database
    console.log(`Attempting to insert ${checklistItemsToInsert.length} recommended tasks...`);
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('checklist_items') // Use the actual table name
      .insert(checklistItemsToInsert)
      .select(); // Optionally select inserted data

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw new Error(`Database error inserting checklist items: ${insertError.message}`);
    }

    console.log(`Successfully inserted ${insertedData?.length ?? 0} recommended tasks.`);

    // Return success response
    return new Response(JSON.stringify({ success: true, count: insertedData?.length ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    console.error("Edge function error:", error);
    const message = error instanceof Error ? error.message : 'Unknown edge function error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 