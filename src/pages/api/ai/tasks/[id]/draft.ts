import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { OpenAI } from 'openai';

// Define type for project details
interface ProjectDetails {
  id: string;
  name: string;
  description?: string | null;
  frontendUrl?: string | null;
  githubRepo?: string | null;
  vercelProjectId?: string | null;
  status?: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Fallback responses in case API fails
const mockAIResponses: Record<string, string> = {
  "personas": `# Target User Personas

1. **Early-Stage Startup Founders (Primary)**
   - Ages 25-40, tech-savvy
   - Building MVP or early product
   - Limited resources and team size
   - Need: Tools to validate ideas and optimize workflows

2. **Solo Technical Founders**
   - Engineering background
   - Struggling with business/marketing aspects
   - Need: Guidance on non-technical aspects of startup

3. **Non-Technical Founders**
   - Business/marketing background
   - Outsourcing development
   - Need: Technical oversight and project management

# Value Proposition

**Core Value Proposition:**
"Launch faster with less stress: We provide founders with an all-in-one toolkit to manage technical projects, track costs, and prepare for launch - even if you're non-technical."

**Key Benefits:**
- **Visibility**: Real-time cost tracking and project status
- **Simplicity**: Unified dashboard for all launch tasks
- **Guidance**: Built-in checklists and AI recommendations
- **Time Savings**: Automate repetitive project management tasks`,

  // Other fallback responses remain unchanged...
  "onboarding": `# MVP Features (Prioritized)

1. **Project Dashboard**
   - Status tracking (design/prep-launch/launched)
   - Cost monitoring integration
   - Frontend URL & repository linking

2. **Launch Checklist**
   - Template tasks customizable per project
   - AI-powered guidance per checklist item
   - Progress tracking & visualization

3. **Vercel Integration**
   - Auto-connect projects
   - Cost tracking
   - Deployment status

4. **GitHub Integration**
   - Repository linking
   - Activity tracking
   - Commit history integration

# Guided Onboarding Flow

1. **Account Creation**
   - Simple email/GitHub/Google auth
   - No credit card required

2. **First Project Setup**
   - Name and description
   - Choose GitHub repo (optional)
   - Connect Vercel project (optional)

3. **Launch Preparation Wizard**
   - Select project type (SaaS, Marketing, etc.)
   - Auto-generate customized checklist
   - AI-generated recommendations

4. **Success Templates**
   - Share onboarding completion with team
   - Suggested next steps based on project type`,

  "landing": `# Landing Page Structure

1. **Hero Section**
   - Headline: "Launch Your Product Faster with Confidence"
   - Subheading: "The all-in-one toolkit that helps technical founders track costs, manage deployments, and prepare for launch"
   - CTA: "Join the Waitlist" (primary)
   - Demo Video/Screenshots

2. **Problem → Solution**
   - Pain points: Cost surprises, scattered tools, launch anxiety
   - Solution: Unified dashboard, predictive costs, guided checklists

3. **Feature Highlights**
   - Project dashboard with cost tracking
   - Vercel & GitHub integrations
   - AI-powered launch assistant
   - Auto-generated documentation

4. **Social Proof**
   - Early adopter testimonials (if available)
   - Integration partner logos
   - "Built by founders for founders"

# Waitlist Funnel

1. **Signup Form**
   - Email only (reduce friction)
   - Optional: "Your biggest launch challenge?" dropdown

2. **Confirmation Page**
   - Share links (Twitter, etc.)
   - Referral mechanism: "Skip the line by inviting 3 friends"

3. **Email Sequence**
   - Welcome + what to expect
   - Founder story / why we built this
   - Sneak peek of features
   - Beta invite (when ready)

4. **Beta Selection Criteria**
   - Prioritize by signup date
   - Boost priority for referrals
   - Mix of technical/non-technical founders
   - Diversity of project types`,

  "beta": `# Closed Beta Strategy

1. **Participant Selection**
   - Target: 25-50 founders
   - Mix of technical/non-technical (60/40 split)
   - Diverse project types (SaaS, marketplace, consumer)
   - Prioritize founders with active projects

2. **Recruitment Channels**
   - Waitlist signups (priority access)
   - Founder communities (IndieHackers, HackerNews)
   - Twitter/LinkedIn direct outreach
   - Y Combinator/TechStars alumni networks

3. **Onboarding Process**
   - Kickoff email with setup instructions
   - 15-min onboarding call option
   - Quick-start guide & video walkthrough
   - Slack community invitation

4. **Feedback Collection Methods**
   - Weekly check-in surveys (NPS + qualitative)
   - In-app feedback widget
   - Bi-weekly user interviews (5 users per cycle)
   - Usage analytics tracking

5. **Success Metrics**
   - 80%+ activation rate (define project + use 3+ features)
   - 60%+ weekly active usage
   - NPS score >40
   - Qualitative feedback shows "can't work without it" sentiment`,

  "analytics": `# Product Analytics Implementation

1. **Core Metrics to Track**
   - Activation: % completing onboarding
   - Engagement: DAU/WAU ratio, feature usage
   - Retention: Week 1/2/4 return rates
   - Growth: Referral rate, viral coefficient

2. **Event Tracking Plan**
   - User: signup, profile completion, invite sent
   - Projects: created, connected to Vercel/GitHub, status changed
   - Checklist: viewed, task completed, AI assistance used
   - Costs: viewed, alert triggered, settings changed

3. **Analytics Stack**
   - PostHog for event tracking & funnels
   - Mixpanel for cohort analysis
   - Amplitude for retention (if needed)
   - Custom dashboard for key metrics

# Feedback Loop Systems

1. **In-app Feedback Mechanisms**
   - NPS survey (after 14 days)
   - Feature reaction buttons (👍/👎)
   - Intercom for chat support
   - Exit surveys for dropped users

2. **Automated User Research**
   - Bi-weekly email asking for 15-min calls
   - Dovetail for research repository
   - UserTesting.com for unmoderated tests
   - Screen recording with HotJar/FullStory

3. **Feedback Prioritization Framework**
   - Impact vs Effort matrix
   - User segment weighting (ideal customer = 2x)
   - Frequency of mention multiplier
   - Roadmap fit alignment`,

  "default": `# AI Task Guidance

I'll help you complete this task by providing:

1. **Strategic recommendations** based on startup best practices
2. **Implementation suggestions** with practical steps
3. **Resource links** to helpful tools and templates

To get specific guidance for this task, please provide more details about:

- Your target audience
- Current stage of your project
- Specific challenges you're facing
- Any resources/tools you're already using

I can then generate tailored advice that will help you complete this task effectively.`
};

// Function to determine content type based on task title or ID
function determineContentType(taskId: string, taskTitle?: string): string {
  let contentType = 'default';
  
  // Use task title if available
  const searchText = (taskTitle || taskId).toLowerCase();
  
  if (searchText.includes('persona') || searchText.includes('value prop')) {
    contentType = 'personas';
  } else if (searchText.includes('mvp') || searchText.includes('onboarding') || searchText.includes('demo')) {
    contentType = 'onboarding';
  } else if (searchText.includes('landing') || searchText.includes('waitlist') || searchText.includes('funnel')) {
    contentType = 'landing';
  } else if (searchText.includes('beta') || searchText.includes('recruit') || searchText.includes('founder')) {
    contentType = 'beta';
  } else if (searchText.includes('analytic') || searchText.includes('feedback') || searchText.includes('instrument')) {
    contentType = 'analytics';
  } else if (taskId.includes('fallback1')) {
    contentType = 'personas';
  } else if (taskId.includes('fallback2')) {
    contentType = 'onboarding';
  } else if (taskId.includes('fallback3')) {
    contentType = 'landing';
  } else if (taskId.includes('fallback4')) {
    contentType = 'beta';
  } else if (taskId.includes('fallback5')) {
    contentType = 'analytics';
  }
  
  return contentType;
}

// Generate prompt for OpenAI API
async function generateDynamicPrompt(taskTitle: string, projectDetails: ProjectDetails): Promise<string> {
  const projectName = projectDetails.name || 'Unknown Project';
  const projectDescription = projectDetails.description || 'No description provided';
  const projectUrl = projectDetails.frontendUrl || '';
  const githubRepo = projectDetails.githubRepo || '';
  
  let prompt = `Task: "${taskTitle}"
Project: "${projectName}"
Project Description: "${projectDescription}"`;

  if (projectUrl) {
    prompt += `\nProject URL: ${projectUrl}`;
  }
  
  if (githubRepo) {
    prompt += `\nGitHub Repository: ${githubRepo}`;
  }
  
  prompt += `\n\nPlease provide detailed, actionable recommendations for completing this task specifically for this project. 
Include specific steps, best practices, and examples that are relevant to this project's context.
Format your response in Markdown with headings, bullet points, and clear sections.`;

  // Add specific instructions based on task type
  const taskType = taskTitle.toLowerCase();
  if (taskType.includes('persona') || taskType.includes('value prop')) {
    prompt += `\n\nFor this value proposition task:
1. Identify specific target user personas for ${projectName}
2. Craft a compelling value proposition 
3. List key benefits that would appeal to the target audience`;
  } else if (taskType.includes('landing') || taskType.includes('waitlist')) {
    prompt += `\n\nFor this landing page task:
1. Suggest landing page structure specific to ${projectName}'s audience
2. Provide headline and CTA recommendations
3. Outline a waitlist strategy appropriate for this project type`;
  }
  
  // Add instruction to use web search if URL is available
  if (projectUrl) {
    prompt += `\n\nPlease analyze the website at ${projectUrl} to provide context-aware recommendations.`;
  }
  
  return prompt;
}

// Generate AI content using OpenAI
async function generateAIContent(
  taskTitle: string,
  projectDetails: ProjectDetails,
  useWebSearch: boolean = true
): Promise<string> {
  try {
    // Generate dynamic prompt based on project details
    const prompt = await generateDynamicPrompt(taskTitle, projectDetails);
    console.log('[AI] Generated prompt:', prompt);
    
    // Prepare system message with instructions
    const systemMessage = 
      "You are a skilled project manager and product strategist who helps founders launch successful products. " + 
      "Provide specific, actionable advice customized to each project's unique context.";
    
    // Include web search context if a URL is available
    const webSearchUrl = useWebSearch && projectDetails.frontendUrl ? projectDetails.frontendUrl : null;
    let userPrompt = prompt;
    
    if (webSearchUrl) {
      userPrompt += `\n\nIncorporate relevant information from the project website, if available: ${webSearchUrl}`;
      console.log('[AI] Including website URL in prompt:', webSearchUrl);
    }
    
    try {
      // Use GPT-4o for high-quality responses
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      return completion.choices[0].message.content || 
             "I couldn't generate specific recommendations. Please try again or provide more project details.";
    } catch (error) {
      console.error('[AI] OpenAI API error:', error);
      throw error;
    }
  } catch (error) {
    console.error('[AI] Error generating content:', error);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(`[API] Received request for ${req.method} ${req.url}`);
  
  // For development, allow requests without authentication
  let session;
  try {
    session = await getServerSession(req, res, authOptions);
  } catch (error) {
    console.warn("Error getting session, continuing anyway:", error);
  }

  // In production, enforce authentication
  if (process.env.NODE_ENV === 'production' && !session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Get checklist item ID from URL
  const { id: taskId } = req.query;
  
  if (typeof taskId !== 'string') {
    return res.status(400).json({ message: 'Invalid task ID' });
  }

  if (req.method === 'POST') {
    try {
      console.log(`[API] Generating AI draft for task ${taskId}`);
      
      // Variables to store task and project info
      let taskTitle: string = '';
      let projectDetails: ProjectDetails | null = null;
      
      // Try to get the task and project details from the database
      if (!taskId.startsWith('fallback') && !taskId.startsWith('mock')) {
        try {
          const task = await prisma.checklistItem.findUnique({
            where: { id: taskId },
            include: {
              project: true // Include the related project
            }
          });
          
          if (task && task.project) {
            taskTitle = task.title;
            projectDetails = task.project as ProjectDetails;
            console.log(`[API] Found task "${taskTitle}" for project "${projectDetails.name}"`);
          }
        } catch (dbError) {
          console.warn(`[API] Error fetching task from database:`, dbError);
          // Continue with fallback if database fetch fails
        }
      }
      
      // If we have project details, generate dynamic content
      if (projectDetails) {
        try {
          console.log(`[API] Generating dynamic content for project "${projectDetails.name}"`);
          
          // Generate AI content using OpenAI
          const aiContent = await generateAIContent(taskTitle, projectDetails);
          
          // Return the dynamic content
          return res.status(200).json({
            id: taskId,
            ai_help_hint: aiContent,
            success: true,
            isDynamic: true
          });
        } catch (aiError) {
          console.error(`[API] Error generating dynamic content:`, aiError);
          // Fall back to template content if AI generation fails
        }
      }
      
      // Fallback to template-based content if dynamic generation failed or no project details
      console.log(`[API] Using template content for task ${taskId}`);
      const contentType = determineContentType(taskId, taskTitle);
      const fallbackContent = mockAIResponses[contentType] || mockAIResponses.default;
      
      return res.status(200).json({
        id: taskId,
        ai_help_hint: fallbackContent,
        success: true,
        isDynamic: false
      });

    } catch (error) {
      console.error(`[API] Failed to generate AI draft for task ${taskId}:`, error);
      res.status(500).json({ 
        message: 'Failed to generate AI draft',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 