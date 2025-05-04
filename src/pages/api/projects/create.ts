import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { CodingPlatform, ProjectStatus } from '@/lib/types';

// Define the request body type
interface CreateProjectRequest {
  name: string;
  description?: string;
  url?: string;
  platform: CodingPlatform;
  repoUrl?: string;
}

// Define the default checklist items
const DEFAULT_CHECKLIST_ITEMS = [
  { title: 'Define MVP', order: 1 },
  { title: 'Set up README', order: 2 },
  { title: 'First deploy', order: 3 },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { name, description, url, platform, repoUrl } = req.body as CreateProjectRequest;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Project name is required' });
    }

    if (!platform) {
      return res.status(400).json({ message: 'Development platform is required' });
    }

    // Create project with Prisma
    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        frontendUrl: url,
        platform,
        githubRepo: repoUrl,
        // Set default thumb placeholder
        thumbUrl: '/images/thumb-placeholder.png',
        // Create default checklist items
        checklistItems: {
          create: DEFAULT_CHECKLIST_ITEMS.map(item => ({
            title: item.title,
            order: item.order,
            is_complete: false
          }))
        }
      },
      include: {
        checklistItems: true
      }
    });

    // Return success with the project ID
    return res.status(201).json({ 
      projectId: newProject.id,
      message: 'Project created successfully with default checklist items'
    });
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A project with that name already exists' });
    }
    
    console.error('Project creation failed:', error);
    return res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
} 