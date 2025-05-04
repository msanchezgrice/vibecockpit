import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for request validation
const refreshChecklistSchema = z.object({
  projectId: z.string().optional(), // Optional - if not provided, will refresh all prep_launch projects
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[API] create-checklists called');
    const { projectId } = refreshChecklistSchema.parse(req.body);
    
    // If projectId is provided, only process that specific project
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Create checklist items if project status is prep_launch
      if (project.status === 'prep_launch') {
        await createChecklistItems(projectId);
        return res.status(200).json({ 
          success: true, 
          message: `Created checklist items for project ${projectId}` 
        });
      } else {
        return res.status(400).json({ 
          success: false, 
          message: `Project ${projectId} is not in 'prep_launch' status` 
        });
      }
    }
    
    // If no projectId provided, process all prep_launch projects
    const prepLaunchProjects = await prisma.project.findMany({
      where: { status: 'prep_launch' },
    });
    
    console.log(`[API] Found ${prepLaunchProjects.length} projects with 'prep_launch' status`);
    
    // Track successes and failures
    const results = {
      total: prepLaunchProjects.length,
      processed: 0,
      errors: 0
    };
    
    // Process each project
    for (const project of prepLaunchProjects) {
      try {
        await createChecklistItems(project.id);
        results.processed++;
      } catch (error) {
        console.error(`[API] Error creating checklist for project ${project.id}:`, error);
        results.errors++;
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: `Processed ${results.processed} projects, with ${results.errors} errors`, 
      results 
    });
    
  } catch (error) {
    console.error('[API] Error in create-checklists:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create checklists', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Helper function to create checklist items for a project
async function createChecklistItems(projectId: string) {
  // Delete any existing checklist items
  await prisma.checklistItem.deleteMany({
    where: { projectId },
  });
  
  // Create new checklist items
  await prisma.checklistItem.createMany({
    data: [
      {
        projectId,
        title: 'Define Minimum Lovable MVP',
        is_complete: false,
        ai_help_hint: 'Focus on the core features that will delight your initial users and provide immediate value.',
        order: 0,
      },
      {
        projectId,
        title: 'Set up /landing page',
        is_complete: false,
        ai_help_hint: 'Create a compelling landing page explaining your product and collecting email signups.',
        order: 1,
      },
      {
        projectId,
        title: 'Add README badges',
        is_complete: false,
        ai_help_hint: 'Add build status, version, and documentation badges to your repository README.',
        order: 2,
      },
      {
        projectId,
        title: 'Push first deploy',
        is_complete: false,
        ai_help_hint: 'Deploy your application to production for the first time.',
        order: 3,
      },
      {
        projectId,
        title: 'Create social media plan',
        is_complete: false,
        ai_help_hint: 'Develop a plan for announcing and promoting your launch on social media platforms.',
        order: 4,
      },
    ],
  });
  
  console.log(`[API] Created 5 checklist items for project ${projectId}`);
  
  // Create a changelog entry
  await prisma.changeLogEntry.create({
    data: {
      projectId,
      provider: 'note',
      message: 'Generated launch checklist',
    },
  });
} 