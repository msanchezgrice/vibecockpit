import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { CodingPlatform, ProjectStatus } from '@/generated/prisma';

// Validation schema
const createProjectSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(140).optional(),
  url: z.string().url().optional().nullable(),
  platform: z.nativeEnum(CodingPlatform),
  repoUrl: z.string().regex(/^[\w-]+\/[\w.-]+$/).optional().nullable(),
  status: z.nativeEnum(ProjectStatus),
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
    // Validate request body
    console.log("Received project creation request:", req.body);
    const validatedData = createProjectSchema.parse(req.body);
    console.log("Validated project data:", validatedData);
    
    // Create the project
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        url: validatedData.url,
        platform: validatedData.platform,
        repoUrl: validatedData.repoUrl,
        status: validatedData.status,
        thumbUrl: '/images/thumb-placeholder.png', // Default placeholder
      }
    });

    console.log("Project created successfully:", {
      id: project.id,
      name: project.name,
      status: project.status
    });

    // Force trigger database function for checklist generation if status is prep_launch
    if (project.status === ProjectStatus.prep_launch) {
      try {
        console.log("Attempting to manually trigger checklist generation for project:", project.id);
        
        // Execute the database function directly
        await prisma.$executeRawUnsafe(`
          SELECT generate_launch_checklist('${project.id}', 'SaaS');
        `);
        
        console.log("Checklist generation triggered for project:", project.id);
      } catch (triggerError) {
        console.error("Failed to trigger checklist generation:", triggerError);
        // Don't fail the request if this fails
      }
    }

    // Track analytics event
    try {
      await prisma.$executeRaw`
        INSERT INTO analytics_events (event_name, user_id, metadata)
        VALUES ('project_created', ${session.user?.email || 'anonymous'}, ${JSON.stringify({ projectId: project.id })})
      `;
    } catch (analyticsError) {
      console.error('Failed to track analytics event:', analyticsError);
      // Don't fail the request if analytics fails
    }

    // Return success response
    return res.status(201).json({
      projectId: project.id,
      status: project.status,
      thumbUrl: project.thumbUrl
    });
  } catch (error) {
    console.error('Project creation failed:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    
    return res.status(500).json({ error: 'Failed to create project', message: error instanceof Error ? error.message : 'Unknown error' });
  }
} 