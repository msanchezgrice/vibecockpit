import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import { openai, supportsResponsesApi, callResponsesApi } from '@/lib/openai'; // Import the helper functions

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
        include: { project: { select: { name: true, description: true } } },
      });

      if (!checklistItem) {
        return res.status(404).json({ message: 'Checklist item not found' });
      }
      if (!checklistItem.project) {
         return res.status(404).json({ message: 'Associated project not found' });
      }

      // 2. Build Prompt
      const prompt = `Task: "${checklistItem.title}"
Project: "${checklistItem.project.name}"
Project Description: "${checklistItem.project.description || 'N/A'}"

Based on the project and task, generate either suitable marketing copy OR a DALL-E-3 image prompt. Choose the most appropriate tool.`;

      // 3. Call OpenAI using Responses API (with fallback to Chat Completions)
      console.log(`[AI Task ${checklistItemId}] Calling OpenAI for task: ${checklistItem.title}`);
      
      let response;
      let isResponsesApi = false;
      
      try {
        if (supportsResponsesApi()) {
          console.log(`[AI Task ${checklistItemId}] Using Responses API`);
          
          // Call Responses API using our helper function
          response = await callResponsesApi({
            model: 'o3',
            input: prompt,
            tools: [generateCopySchema, generateImageSchema],
            toolChoice: "auto",
            instructions: "You are a skilled marketer and creative director. Generate content that is concise, compelling, and aligned with the project goals."
          });
          
          isResponsesApi = true;
        } else {
          throw new Error('Responses API not supported');
        }
      } catch (apiError) {
        // Properly type the error
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
        console.log(`[AI Task ${checklistItemId}] Falling back to Chat Completions API: ${errorMessage}`);
        
        // Fallback to Chat Completions API
        response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: "You are a skilled marketer and creative director. Generate content that is concise, compelling, and aligned with the project goals."
            },
            { role: 'user', content: prompt }
          ],
          tools: [generateCopySchema, generateImageSchema],
          tool_choice: "auto",
        });
      }

      // 4. Process Response & 5. Update DB
      const updateData: Prisma.ChecklistItemUpdateInput = {};
      let generatedContentType: string | null = null;

      if (isResponsesApi) {
        // Parse Responses API format
        if (response.tool_calls && response.tool_calls.length > 0) {
          const toolCall = response.tool_calls[0];
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
        } else if (response.output_text) {
          console.log(`[AI Task ${checklistItemId}] OpenAI responded with direct text.`);
          updateData.ai_help_hint = response.output_text;
          updateData.ai_image_prompt = null;
          generatedContentType = 'direct_content';
        }
      } else {
        // Parse Chat Completions API format
        const choice = response.choices[0];
        if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
          const toolCall = choice.message.tool_calls[0];
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
        } else if (choice.message?.content) {
          console.log(`[AI Task ${checklistItemId}] OpenAI responded with direct text.`);
          updateData.ai_help_hint = choice.message.content;
          updateData.ai_image_prompt = null;
          generatedContentType = 'direct_content';
        }
      }

      if (Object.keys(updateData).length === 0) {
        console.error(`[AI Task ${checklistItemId}] Unexpected OpenAI response structure.`);
        throw new Error("Received an unexpected response structure from AI.");
      }

      // Update the database
      console.log(`[AI Task ${checklistItemId}] Updating database with ${generatedContentType}`);
      const updatedItem = await prisma.checklistItem.update({
         where: { id: checklistItemId },
         data: updateData,
      });
      res.status(200).json(updatedItem);

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