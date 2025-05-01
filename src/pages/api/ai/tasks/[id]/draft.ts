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

// --- OpenAI Tool Schemas --- 
const generateCopySchema = {
    type: 'function' as const,
    function: {
        name: 'generate_copy',
        description: 'Generate marketing copy based on a task title and project name.',
        parameters: {
            type: 'object',
            properties: { 
                copy: { type: 'string', description: 'The generated marketing copy.' } 
            },
            required: ['copy']
        }
    }
};

const generateImageSchema = {
    type: 'function' as const,
    function: {
        name: 'generate_image_prompt',
        description: 'Generate an image prompt suitable for DALL-E-3 based on a task title and project name.',
        parameters: {
            type: 'object',
            properties: { 
                image_prompt: { type: 'string', description: 'The generated DALL-E-3 prompt.' } 
            },
            required: ['image_prompt']
        }
    }
};
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
      // *** PARSING NEEDS ADJUSTMENT based on actual responses.create output ***
      console.log(`[AI Task ${checklistItemId}] Raw response object:`, response);

      // TODO: Adapt parsing logic based on the ACTUAL structure of the `response` object
      // The structure might be different from the chat/completions response.
      // How are tool calls represented in the response from responses.create?
      // Inspect the actual `response` object logged above.

      // --- Placeholder for new parsing logic ---
      let updateData: Prisma.ChecklistItemUpdateInput = {};
      let generatedContentType: string | null = null;

      // Example: Hypothetical structure - THIS WILL LIKELY NEED TO BE CHANGED
      // Accessing fields like `response.output.tool_calls` or similar based on console log.
      // Adjust the following logic based on what you see in the logged `response` object.
      const output = response.output; // Assuming the main content is in an 'output' field

      if (output?.tool_calls && output.tool_calls.length > 0) { // Hypothetical path
         const toolCall = output.tool_calls[0];
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
             console.warn(`[AI Task ${checklistItemId}] Tool call response format unexpected.`);
          }
      } else if (output?.content) { // Hypothetical path for direct text content
         console.log(`[AI Task ${checklistItemId}] OpenAI responded directly.`);
         updateData.ai_help_hint = output.content;
         updateData.ai_image_prompt = null;
         generatedContentType = 'direct_content';
      } else {
         console.error(`[AI Task ${checklistItemId}] Unexpected response structure from responses.create.`);
         // Consider throwing an error if no usable output is found
         // throw new Error("Unexpected response structure from AI.");
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