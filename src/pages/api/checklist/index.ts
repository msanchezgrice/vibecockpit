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

// Schema for task creation
const taskCreateSchema = z.object({
  projectId: z.string().min(1, { message: "Project ID cannot be empty" }),
  title: z.string().min(1, { message: "Task title cannot be empty" }),
  is_complete: z.boolean().default(false),
  is_persistent: z.boolean().default(false), // We'll handle this in metadata
  ai_help_hint: z.string().optional().nullable(),
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
      const validationResult = taskCreateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: 'Invalid task data', errors: validationResult.error.errors });
      }
      
      const { projectId, title, is_complete, is_persistent, ai_help_hint } = validationResult.data;
      
      // Get the highest order value to append the new task at the end
      const highestOrderTask = await prisma.checklistItem.findFirst({
        where: { projectId },
        orderBy: { order: 'desc' },
      });
      
      const newOrder = highestOrderTask ? highestOrderTask.order + 1 : 0;
      
      // Add a prefix to the title for persistent tasks (can be filtered in UI)
      const taskTitle = is_persistent ? `[USER] ${title}` : title;
      
      // Create the new task
      const newTask = await prisma.checklistItem.create({
        data: {
          projectId,
          title: taskTitle,
          is_complete,
          ai_help_hint: ai_help_hint || null,
          order: newOrder,
        },
      });
      
      // Add the is_persistent flag to the response for client-side usage
      const responseTask = {
        ...newTask,
        is_persistent,
      };
      
      res.status(201).json(responseTask);
      
    } catch (error) {
      console.error('Error creating checklist item:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
} 