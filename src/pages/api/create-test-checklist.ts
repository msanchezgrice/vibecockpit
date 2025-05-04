import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Schema for request validation
const createChecklistSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  itemCount: z.number().min(1).max(10).default(3),
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
    const data = createChecklistSchema.parse(req.body);
    const { projectId, itemCount } = data;

    // Normalize project ID to ensure UUID format
    let formattedProjectId = projectId;
    if (projectId.indexOf('-') === -1 && projectId.length === 32) {
      formattedProjectId = `${projectId.slice(0,8)}-${projectId.slice(8,12)}-${projectId.slice(12,16)}-${projectId.slice(16,20)}-${projectId.slice(20)}`;
    }

    // Create sample checklist items
    const testItems = Array.from({ length: itemCount }).map((_, index) => ({
      projectId: formattedProjectId,
      title: `Test Checklist Item ${index + 1}`,
      is_complete: index === 0, // First item will be complete
      ai_help_hint: `This is a test help hint for item ${index + 1}`,
      order: index + 1,
    }));

    // Delete any existing checklist items for this project
    await prisma.checklistItem.deleteMany({
      where: { projectId: formattedProjectId },
    });

    // Create new checklist items
    const createdItems = await prisma.checklistItem.createMany({
      data: testItems,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Created ${createdItems.count} test checklist items for project ${formattedProjectId}`,
      projectId: formattedProjectId,
    });
  } catch (error) {
    console.error('Error creating test checklist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create test checklist',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 