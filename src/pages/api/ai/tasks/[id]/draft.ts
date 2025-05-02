import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma'; // Import singleton instance

// Mock AI responses for different task types
const mockAIResponses: Record<string, string> = {
  // First task: User Personas & Value Proposition
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

  // Second task: MVP & Onboarding
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

  // Third task: Landing Page & Waitlist
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

  // Fourth task: Closed Beta
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

  // Fifth task: Analytics & Feedback
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

  // Default response
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
      console.log(`Generating AI draft for task ${taskId}`);
      
      let taskTitle: string | undefined;
      
      // Try to get the task title from the database if it's not a fallback/mock ID
      if (!taskId.startsWith('fallback') && !taskId.startsWith('mock')) {
        try {
          const task = await prisma.checklistItem.findUnique({
            where: { id: taskId },
          });
          
          if (task) {
            taskTitle = task.title;
            console.log(`Found task in database: ${taskTitle}`);
          }
        } catch (dbError) {
          console.warn(`Error fetching task from database:`, dbError);
          // Continue with taskId-based determination if database fetch fails
        }
      }
      
      // Determine content type based on task title or ID
      const contentType = determineContentType(taskId, taskTitle);
      console.log(`Using content type: ${contentType} for task: ${taskTitle || taskId}`);
      
      // Get the appropriate response content
      const aiContent = mockAIResponses[contentType] || mockAIResponses.default;
      
      // Return success with the AI content
      return res.status(200).json({
        id: taskId,
        ai_help_hint: aiContent,
        success: true,
      });

    } catch (error) {
      console.error(`Failed to generate AI draft for task ${taskId}:`, error);
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