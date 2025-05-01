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

      // 2. Build Prompt
      // Simple prompt example, can be refined
      const prompt = `Task: "${checklistItem.title}"
Project: "${checklistItem.project.name}"
Project Description: "${checklistItem.project.description || 'N/A'}"

Based on the project and task, generate either suitable marketing copy OR a DALL-E-3 image prompt. Choose the most appropriate tool.`;

      // 3. Call OpenAI
      console.log(`[AI Task ${checklistItemId}] Calling OpenAI for task: ${checklistItem.title}`);
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use appropriate model ('o3' alias if configured, else gpt-3.5/4)
        messages: [{ role: 'user', content: prompt }],
        tools: [generateCopySchema, generateImageSchema],
        tool_choice: "auto", // Let the model choose the tool
      });

      // 4. Process Response & 5. Update DB
      const choice = response.choices[0];
      const updateData: Prisma.ChecklistItemUpdateInput = {};
      let generatedContentType: string | null = null;

      if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments || '{}');

        console.log(`[AI Task ${checklistItemId}] OpenAI chose tool: ${functionName}`);

        if (functionName === 'generate_copy' && functionArgs.copy) {
          updateData.ai_help_hint = functionArgs.copy; // Save copy to hint field
          updateData.ai_image_prompt = null; // Clear image prompt
          generatedContentType = 'copy';
        } else if (functionName === 'generate_image_prompt' && functionArgs.image_prompt) {
          updateData.ai_image_prompt = functionArgs.image_prompt; // Save image prompt
          updateData.ai_help_hint = null; // Clear text hint
          generatedContentType = 'image_prompt';
        } else {
           console.warn(`[AI Task ${checklistItemId}] Tool call response format unexpected.`);
           // Fallback to saving the raw response text if needed?
           // updateData.ai_help_hint = choice.message.content || "AI response format unclear.";
        }
      } else if (choice.message?.content) {
        // Handle cases where the model responds directly without a tool call
         console.log(`[AI Task ${checklistItemId}] OpenAI responded directly.`);
         updateData.ai_help_hint = choice.message.content;
         updateData.ai_image_prompt = null;
         generatedContentType = 'direct_content';
      } else {
         console.error(`[AI Task ${checklistItemId}] Unexpected OpenAI response structure.`);
         throw new Error("Received an unexpected response structure from AI.");
      }

      if (Object.keys(updateData).length > 0) {
         console.log(`[AI Task ${checklistItemId}] Updating database with ${generatedContentType}`);
         const updatedItem = await prisma.checklistItem.update({
            where: { id: checklistItemId },
            data: updateData,
         });
         res.status(200).json(updatedItem);
      } else {
         console.log(`[AI Task ${checklistItemId}] No update data generated.`);
         // Return original item or an appropriate message
         res.status(200).json(checklistItem);
      }

    } catch (error) {
       if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        res.status(404).json({ message: 'Checklist item not found' });
      } else {
        console.error(`Failed to generate AI draft for item ${checklistItemId}:`, error);
        res.status(500).json({ message: 'Failed to generate AI draft' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 