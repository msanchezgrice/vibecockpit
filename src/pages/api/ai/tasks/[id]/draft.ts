import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma';
import { openai, supportsResponsesApi, callResponsesApi, callResponsesWithWebSearch, extractWebSearchResults, ResponsesAPIResponse } from '@/lib/openai';
import { ChatCompletion } from 'openai/resources';

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

const webResearchSchema = {
    type: 'function' as const,
    function: {
        name: 'web_research',
        description: 'Generate task recommendations based on web research',
        parameters: {
            type: 'object',
            properties: {
                recommendations: {
                    type: 'array',
                    description: 'List of recommendations with references',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string', description: 'Short title for this recommendation' },
                            description: { type: 'string', description: 'Detailed explanation of the recommendation' },
                            source: { type: 'string', description: 'URL source of this information (if any)' }
                        }
                    }
                },
                summary: { type: 'string', description: 'Brief summary of the research findings' }
            },
            required: ['recommendations', 'summary']
        }
    }
};

// Add a new tool schema for landing page mockups with inline CSS
const landingPageMockupSchema = {
    type: 'function' as const,
    function: {
        name: 'generate_landing_page_mockup',
        description: 'Generate a landing page mockup with inline CSS styling in markdown format.',
        parameters: {
            type: 'object',
            properties: { 
                html_mockup: { 
                    type: 'string', 
                    description: 'The generated HTML and CSS mockup. Start with all CSS styles followed by the actual HTML content. Format CSS like this: "body { font-family: Arial; } .header { background-color: #007BFF; }" and then add the HTML structure afterward.' 
                } 
            },
            required: ['html_mockup']
        }
    }
};

// Define interfaces for API responses
interface Recommendation {
  title: string;
  description: string;
  source?: string;
}

interface _WebResearchResponse {
  recommendations: Recommendation[];
  summary: string;
}

// Define response types for better type checking
interface ResponsesApiResponse {
  tool_calls?: Array<{ function: { name: string; arguments: string } }>;
  output_text?: string;
}

// Type guard to check if the response is from Responses API
function isResponsesApiFormat(obj: unknown): obj is ResponsesApiResponse {
  if (!obj || typeof obj !== 'object') return false;
  const response = obj as Record<string, unknown>;
  return ('tool_calls' in response || 'output_text' in response);
}

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
        include: { project: { select: { name: true, description: true, frontendUrl: true, githubRepo: true } } },
      });

      if (!checklistItem) {
        return res.status(404).json({ message: 'Checklist item not found' });
      }
      if (!checklistItem.project) {
         return res.status(404).json({ message: 'Associated project not found' });
      }

      // 2. Extract task reasoning from request body (if provided)
      const { taskReasoning } = req.body || {};
      
      // 3. Build base prompt
      const taskTitle = checklistItem.title;
      const projectName = checklistItem.project.name;
      const projectDescription = checklistItem.project.description || 'N/A';
      const projectUrl = checklistItem.project.frontendUrl;
      const githubRepo = checklistItem.project.githubRepo;
      
      // 3. First, try to use the Responses API with web search if available
      let response: ResponsesAPIResponse | ChatCompletion;
      let usedWebSearch = false;
      
      try {
        if (supportsResponsesApi()) {
          console.log(`[AI Task ${checklistItemId}] Using Responses API with web search`);
          
          // Update the instructions with CSS guidance and include task reasoning if available
          const instructions = `You are a skilled project manager and creative director helping with a project task. 
For the task "${taskTitle}" in project "${projectName}" (${projectDescription}), search for information online
and provide specific, actionable recommendations. Include proper attribution to sources with URLs.

${taskReasoning ? `TASK CONTEXT: ${taskReasoning}\n` : ''}

Project Website: ${projectUrl || 'Not available'}
Project GitHub: ${githubRepo || 'Not available'}

If the task involves creating a landing page, website, or UI design, provide a mockup using markdown with inline HTML and CSS.
Use <div>, <section>, <h1>, <p>, and other semantic HTML tags with inline style attributes for precise styling.
Example: <div style="display: flex; justify-content: space-between; background-color: #f5f5f5; padding: 20px;">Content</div>

Format your response with a brief summary followed by numbered recommendations or a visual mockup. For each recommendation, include:
1. A clear, actionable title
2. A concise explanation
3. Attribution to sources when applicable`;
          
          // Create a search query based on task and project
          const searchQuery = `Best practices and recommendations for "${taskTitle}" in context of "${projectName}" project`;
          
          // Use web search via Responses API
          response = await callResponsesWithWebSearch(searchQuery, instructions);
          usedWebSearch = true;
        } else {
          throw new Error('Responses API not supported');
        }
      } catch (apiError) {
        // Properly type the error
        const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown error';
        console.log(`[AI Task ${checklistItemId}] Falling back to tools approach: ${errorMessage}`);
        
        // Build standard prompt (without web search)
        const prompt = `Task: "${taskTitle}"
Project: "${projectName}"
Project Description: "${projectDescription}"
Project Website: ${projectUrl || 'Not available'}
Project GitHub: ${githubRepo || 'Not available'}
${taskReasoning ? `\nTask Context/Reasoning: ${taskReasoning}` : ''}

Based on the project and task details${taskReasoning ? ' and the specific task context' : ''}, provide specific, actionable recommendations. If appropriate, generate either suitable marketing copy OR a DALL-E-3 image prompt (choose what's most relevant to the task).`;
        
        // Try to use Responses API with tools
        if (supportsResponsesApi()) {
          try {
            response = await callResponsesApi({
              model: 'gpt-4o-2024-11-20',
              input: prompt,
              tools: [generateCopySchema, generateImageSchema, webResearchSchema, landingPageMockupSchema],
              toolChoice: "auto",
              instructions: "You are a skilled project manager, creative director, and web designer. Generate content that is concise, compelling, and aligned with the project goals. If the task involves UI or landing pages, structure your response in two parts: 1) All CSS styles at the top in a single block, followed by 2) The HTML structure. Do not mix inline styles with HTML tags. Example: 'body { font-family: Arial; } .header { background: blue; } \n\n <div class=\"header\">Content</div>'"
            });
          } catch (error) {
            console.log(`[AI Task ${checklistItemId}] Falling back to Chat Completions API: ${error instanceof Error ? error.message : 'Unknown error'}`);
            
            // Fallback to Chat Completions API
            response = await openai.chat.completions.create({
              model: 'gpt-4o-2024-11-20',
              messages: [
                {
                  role: 'system',
                  content: "You are a skilled project manager, creative director, and web designer. Generate content that is concise, compelling, and aligned with the project goals. If the task involves UI or landing pages, structure your response in two parts: 1) All CSS styles at the top in a single block, followed by 2) The HTML structure. Do not mix inline styles with HTML tags. Example: 'body { font-family: Arial; } .header { background: blue; } \n\n <div class=\"header\">Content</div>'"
                },
                { role: 'user', content: prompt }
              ],
              tools: [generateCopySchema, generateImageSchema, webResearchSchema, landingPageMockupSchema],
              tool_choice: "auto",
            });
          }
        } else {
          // Fallback to Chat Completions API
          response = await openai.chat.completions.create({
            model: 'gpt-4o-2024-11-20',
            messages: [
              {
                role: 'system',
                content: "You are a skilled project manager, creative director, and web designer. Generate content that is concise, compelling, and aligned with the project goals. If the task involves UI or landing pages, structure your response in two parts: 1) All CSS styles at the top in a single block, followed by 2) The HTML structure. Do not mix inline styles with HTML tags. Example: 'body { font-family: Arial; } .header { background: blue; } \n\n <div class=\"header\">Content</div>'"
              },
              { role: 'user', content: prompt }
            ],
            tools: [generateCopySchema, generateImageSchema, webResearchSchema, landingPageMockupSchema],
            tool_choice: "auto",
      });
        }
      }

      // 4. Process Response & 5. Update DB
      const updateData: Prisma.ChecklistItemUpdateInput = {};
      let generatedContentType: string | null = null;

      // Process Responses API with web search format
      if (usedWebSearch && 'output' in response) {
        console.log(`[AI Task ${checklistItemId}] Processing web search response`);
        
        let responseText = '';
        
        // Extract the assistant's text from the response
        if (response.output && Array.isArray(response.output)) {
          for (const output of response.output) {
            if (output.role === 'assistant' && output.content && Array.isArray(output.content)) {
              for (const content of output.content) {
                if (content.text) {
                  responseText = content.text;
                  break;
                }
              }
              if (responseText) break;
            }
          }
        }
        
        if (responseText) {
          // Extract web search results
          const searchResults = extractWebSearchResults(response);
          
          // Save both the formatted text and the search results
          updateData.ai_help_hint = responseText;
          updateData.ai_image_prompt = null;
          generatedContentType = 'web_research';
          
          console.log(`[AI Task ${checklistItemId}] Web search found ${searchResults.length} results`);
        } else {
          console.log(`[AI Task ${checklistItemId}] Web search did not return formatted text`);
          updateData.ai_help_hint = "Couldn't get web search results. Please try again later.";
          updateData.ai_image_prompt = null;
          generatedContentType = 'error';
        }
      }
      // Process standard Responses API format
      else if (isResponsesApiFormat(response)) {
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
          } else if (functionName === 'web_research' && functionArgs.recommendations) {
            // Format web research results
            const summary = functionArgs.summary || '';
            const recommendations = functionArgs.recommendations || [];
            
            let formattedText = `## Summary\n${summary}\n\n## Recommendations\n`;
            
            recommendations.forEach((rec: Recommendation, index: number) => {
              formattedText += `\n### ${index + 1}. ${rec.title}\n${rec.description}\n`;
              if (rec.source) {
                formattedText += `Source: ${rec.source}\n`;
              }
            });
            
            updateData.ai_help_hint = formattedText;
            updateData.ai_image_prompt = null;
            generatedContentType = 'web_research';
          } else if (functionName === 'generate_landing_page_mockup' && functionArgs.html_mockup) {
            updateData.ai_help_hint = functionArgs.html_mockup;
            updateData.ai_image_prompt = null;
            generatedContentType = 'landing_page_mockup';
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
          } else if (functionName === 'web_research' && functionArgs.recommendations) {
            // Format web research results
            const summary = functionArgs.summary || '';
            const recommendations = functionArgs.recommendations || [];
            
            let formattedText = `## Summary\n${summary}\n\n## Recommendations\n`;
            
            recommendations.forEach((rec: Recommendation, index: number) => {
              formattedText += `\n### ${index + 1}. ${rec.title}\n${rec.description}\n`;
              if (rec.source) {
                formattedText += `Source: ${rec.source}\n`;
              }
            });
            
            updateData.ai_help_hint = formattedText;
            updateData.ai_image_prompt = null;
            generatedContentType = 'web_research';
        } else if (functionName === 'generate_landing_page_mockup' && functionArgs.html_mockup) {
          updateData.ai_help_hint = functionArgs.html_mockup;
          updateData.ai_image_prompt = null;
          generatedContentType = 'landing_page_mockup';
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