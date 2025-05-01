import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma'; // Import singleton instance
import { Prisma } from '@/generated/prisma'; // Keep type import if needed
// import { z, ZodError } from 'zod'; // Removed unused Zod imports
import { OpenAI } from 'openai'; // Ensure OpenAI is imported
// import { PrismaClient, Prisma } from '@/generated/prisma'; // Remove direct import

// const prisma = new PrismaClient(); // Remove direct instantiation

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- OpenAI Tool Definitions ---
// Commenting out unused schemas temporarily until tool passing for responses.create is confirmed
/*
const generateCopySchema = {
    type: 'function' as const,
    function: { ... } // Keep full definition
};

const generateImageSchema = {
    type: 'function' as const,
    function: { ... } // Keep full definition
};
*/
// -----------------------------

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[API] Received request for ${req.method} ${req.url}`);
  const session = await getServerSession(req, res, authOptions);
  const { id: checklistItemId } = req.query; 

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (typeof checklistItemId !== 'string') {
    return res.status(400).json({ message: 'Invalid checklist item ID' });
  }

  if (req.method === 'POST') {
    try {
      // 1. Fetch Task and Project details
      const checklistItem = await prisma.checklistItem.findUnique({
        where: { id: checklistItemId },
        include: { project: { select: { name: true, description: true } } }, // Include project context
      });

      if (!checklistItem) {
        return res.status(404).json({ message: 'Checklist item not found' });
      }
      if (!checklistItem.project) {
         return res.status(404).json({ message: 'Associated project not found' });
      }

      // 2. Build Input String for the Responses API
      const inputPrompt = `Task: "${checklistItem.title}"
Project: "${checklistItem.project.name}"
Project Description: "${checklistItem.project.description || 'N/A'}"

Based on the project and task, generate either suitable marketing copy OR a DALL-E-3 image prompt. Choose the most appropriate tool.`;

      // 3. Call the NEW Responses API endpoint
      console.log(`[AI Task ${checklistItemId}] Calling OpenAI Responses API for task: ${checklistItem.title}`);

      // *** SWITCHING TO responses.create ***
      const response = await openai.responses.create({ // Use responses.create
        model: 'gpt-4o', // Use gpt-4o model
        input: inputPrompt, // Use the combined input string
        // *** ADJUSTMENT NEEDED? *** Pass tools if/how supported by responses.create
        // The method might take `tools` and `tool_choice` directly, or handle it differently.
        // Check the specific SDK documentation or experiment.
        // Example (might be wrong format):
        // tools: [generateCopySchema, generateImageSchema],
        // tool_choice: "auto",
      });

      // 4. Process Response & 5. Update DB
      // *** PARSING NEEDS ADJUSTMENT based on actual responses.create output logged above ***
      console.log(`[AI Task ${checklistItemId}] Raw response object:`, JSON.stringify(response, null, 2)); // Log the full structure

      // TODO: Adapt parsing logic based on the ACTUAL structure of the `response` object
      // The structure might be different from the chat/completions response.
      // How are tool calls represented in the response from responses.create?
      // Inspect the actual `response` object logged above.

      // --- Refined Placeholder Parsing Logic (NEEDS VERIFICATION) ---
      const outputItems = response.output; // Assuming 'output' is the primary field

      const updateData: Prisma.ChecklistItemUpdateInput = {}; // Use const
      let generatedContentType: string | null = null;

      if (Array.isArray(outputItems) && outputItems.length > 0) {
        // Iterate through output items (assuming it might be an array like messages/steps)
        for (const item of outputItems) {
          // Check for direct text content (adjust 'item.type' and 'item.content' based on actual structure)
          if (item.type === 'message' && item.content?.text) {
             console.log(`[AI Task ${checklistItemId}] OpenAI responded directly with text.`);
             updateData.ai_help_hint = item.content.text; // Adjust path as needed
             updateData.ai_image_prompt = null;
             generatedContentType = 'direct_content';
             break; // Stop processing if direct text is found (adjust if multiple outputs are possible)
          }

          // Check for custom tool calls (adjust 'item.type' and 'item.tool_calls' based on actual structure)
          if (item.type === 'tool_calls' && Array.isArray(item.tool_calls)) {
             const toolCall = item.tool_calls[0]; // Assuming only one tool call for now
             if (toolCall?.type === 'function') {
                 const functionName = toolCall.function.name;
                 const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                 console.log(`[AI Task ${checklistItemId}] OpenAI chose tool: ${functionName}`);

                 if (functionName === 'generate_copy' && functionArgs.copy) {
                    updateData.ai_help_hint = functionArgs.copy;
                    updateData.ai_image_prompt = null;
                    generatedContentType = 'copy';
                 } else if (functionName === 'generate_image_prompt' && functionArgs.image_prompt) {
                    updateData.ai_image_prompt = functionArgs.image_prompt;
                    updateData.ai_help_hint = null;
                    generatedContentType = 'image_prompt';
                 } else {
                    console.warn(`[AI Task ${checklistItemId}] Unhandled custom tool call: ${functionName}`);
                 }
                 break; // Stop processing after handling tool call
             }
          }

          // Check for web search results (adjust path and structure based on actual response)
          // Example: if web search results are directly in an item or nested
          if (item.type === 'web_search_results' && item.results) { // HYPOTHETICAL STRUCTURE
              console.log(`[AI Task ${checklistItemId}] Web search was used.`);
              // Decide how to use web search results - maybe add to ai_help_hint?
              // For now, just logging, not saving directly.
              // updateData.ai_help_hint = `Web Search Results:\n${JSON.stringify(item.results)}`;
              // generatedContentType = 'web_search';
              // break; // Or continue processing?
          }
        }
      }
      // --- End Placeholder ---

      // Update database if content was generated
      if (Object.keys(updateData).length > 0) {
         console.log(`[AI Task ${checklistItemId}] Updating database with ${generatedContentType}`);
         const updatedItem = await prisma.checklistItem.update({
            where: { id: checklistItemId },
            data: updateData,
         });
         res.status(200).json(updatedItem); // Return the updated item
      } else {
         console.log(`[AI Task ${checklistItemId}] No update data generated.`);
         // Return original item or an appropriate message/status
         // Returning original item might be confusing if user expected AI output
         res.status(200).json({ message: "AI did not generate usable content.", item: checklistItem });
      }

    } catch (error) {
       // Log the specific error
       console.error(`Failed API call for item ${checklistItemId}:`, error);

       // Handle Prisma not found error specifically
       if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ message: 'Checklist item not found' });
      } else if (error instanceof Error) {
        // Handle potential OpenAI API errors or other errors
        res.status(500).json({ message: `Failed to generate AI draft: ${error.message}` });
      } else {
        // Fallback for unknown errors
        res.status(500).json({ message: 'An unknown error occurred' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 