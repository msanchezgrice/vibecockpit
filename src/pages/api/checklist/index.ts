import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma'; // Import singleton instance
import { z } from 'zod';

// const prisma = new PrismaClient(); // Remove direct instantiation

// Schema to validate query parameters
const querySchema = z.object({
  // projectId: z.string().uuid({ message: "Invalid Project ID format" }),
  projectId: z.string().min(1, { message: "Project ID cannot be empty" }), // Relaxed validation
});

// Schema for creating a new checklist item
const createItemSchema = z.object({
  projectId: z.string().min(1, { message: "Project ID cannot be empty" }),
  title: z.string().min(1, { message: "Task title cannot be empty" }),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      // Validate query parameters
      const validationResult = querySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({ message: 'Invalid query parameters', errors: validationResult.error.errors });
      }
      const { projectId } = validationResult.data;

      // Optional: Check if user owns/has access to this project ID

      const checklistItems = await prisma.checklistItem.findMany({
        where: {
          projectId: projectId,
        },
        orderBy: {
          order: 'asc', // Order by the 'order' field
        },
      });

      const completedCount = checklistItems.filter(item => item.is_complete).length;

      // Return data in the format expected by useChecklist hook
      const responseData = {
        tasks: checklistItems,
        completed_tasks: completedCount,
        total_tasks: checklistItems.length,
      };

      res.status(200).json(responseData);

    } catch (error) {
      console.error('Error fetching checklist items:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      // Validate request body
      const validationResult = createItemSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: 'Invalid request data', errors: validationResult.error.errors });
      }
      const { projectId, title } = validationResult.data;

      // Find the current maximum order value for the project
      const maxOrderItem = await prisma.checklistItem.findFirst({
        where: { projectId },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      
      const newOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

      // Create the new checklist item
      const _newItem = await prisma.checklistItem.create({
        data: {
          projectId,
          title,
          order: newOrder,
        },
      });

      // Refetch all tasks to return updated list
      const checklistItems = await prisma.checklistItem.findMany({
        where: { projectId },
        orderBy: { order: 'asc' },
      });

      const completedCount = checklistItems.filter(item => item.is_complete).length;

      // Return data in the format expected by useChecklist hook
      const responseData = {
        tasks: checklistItems,
        completed_tasks: completedCount,
        total_tasks: checklistItems.length,
      };

      res.status(201).json(responseData);
    } catch (error) {
      console.error('Error creating checklist item:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 