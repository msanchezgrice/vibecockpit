import { serve } from "jsr:@std/http/server";
import { OpenAI } from "npm:openai@^4"; // Import OpenAI SDK
import { createClient } from 'npm:@supabase/supabase-js@2'; // Import Supabase client
import { corsHeaders } from '../_shared/cors.ts'; // Assuming shared CORS headers

console.log("launch-checklist function booting up...");

// Initialize OpenAI Client (ensure OPENAI_API_KEY is set in Edge Function env vars)
const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

// Define the expected OpenAI function call schema
const fnSchema = {
  type: 'function' as const, // Add type assertion
  function: {
      name: 'generate_launch_checklist',
      description: 'Generate a 10-step launch checklist for a SaaS product.',
      parameters: {
        type: 'object',
        properties: {
          tasks: { 
            type: 'array',
            description: 'List of launch checklist tasks.',
            items: { 
                type:'object', 
                properties:{ 
                    title:{ type:'string', description: 'Concise title of the checklist task.' }, 
                    description:{ type:'string', description: 'Optional brief description of the task.' }, 
                    ai_help_hint:{ type:'string', description: 'Optional hint for AI assistance later.' } 
                }, 
                required:['title'] 
            } 
          }
        },
        required:['tasks']
      }
  }
};

interface ChecklistTaskData {
    title: string;
    description?: string;
    ai_help_hint?: string;
}

serve(async (req) => {
  console.log('Request received for launch-checklist');
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Ensure Supabase client is initialized correctly (requires env vars)
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { persistSession: false } }
    );

    const { project_id, category } = await req.json();
    console.log(`Generating checklist for project: ${project_id}, category: ${category}`);

    if (!project_id || !category) {
        throw new Error("Missing project_id or category in request body");
    }

    // 1. Call OpenAI
    const rsp = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use a suitable model like gpt-3.5-turbo or gpt-4
      messages: [{ role:'user', content:`Generate a 10-step launch checklist (tasks only) for a ${category} web application named 'Example Project' (replace name later). Include brief descriptions and AI help hints for some tasks.` }],
      tools: [fnSchema],
      tool_choice: { type:'function', function: { name: 'generate_launch_checklist' } }, // Correct tool_choice structure
    });

    // 2. Parse Response
    const choice = rsp.choices[0];
    const functionCall = choice.message?.tool_calls?.[0]?.function;

    if (!functionCall?.arguments) {
      console.error("OpenAI response missing function call arguments:", rsp);
      throw new Error('Failed to parse checklist from OpenAI response.');
    }

    console.log("Raw OpenAI arguments:", functionCall.arguments);
    let parsedTasks: { tasks: ChecklistTaskData[] };
    try {
       parsedTasks = JSON.parse(functionCall.arguments);
    } catch (parseError) {
        console.error("Failed to parse OpenAI JSON:", parseError, "Raw args:", functionCall.arguments);
        throw new Error("Invalid JSON format received from OpenAI.");
    }
    
    const tasks = parsedTasks.tasks;
    console.log(`Received ${tasks?.length ?? 0} tasks from OpenAI.`);

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
        throw new Error("No valid tasks received from OpenAI.");
    }

    // 3. Format data for Supabase/Prisma insertion
    const checklistItemsToInsert = tasks.map((task, index) => ({
      projectId: project_id, // Link to the project
      title: task.title,
      // description: task.description, // Add if description is in your schema
      ai_help_hint: task.ai_help_hint,
      order: index + 1, // Simple ordering
      is_complete: false, // Default to not complete
    }));

    // 4. Insert into Database
    console.log(`Attempting to insert ${checklistItemsToInsert.length} checklist items...`);
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('checklist_items') // Use the actual table name
      .insert(checklistItemsToInsert)
      .select(); // Optionally select inserted data

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      throw new Error(`Database error inserting checklist items: ${insertError.message}`);
    }

    console.log(`Successfully inserted ${insertedData?.length ?? 0} checklist items.`);

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