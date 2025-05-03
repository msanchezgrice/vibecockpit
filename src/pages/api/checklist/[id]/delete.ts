import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id: checklistItemId } = req.query; // Checklist item ID from URL

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (typeof checklistItemId !== 'string') {
    return res.status(400).json({ message: 'Invalid checklist item ID' });
  }

  try {
    // First, get the item to identify its project
    const item = await prisma.checklistItem.findUnique({
      where: { id: checklistItemId },
      select: { projectId: true }
    });

    if (!item) {
      return res.status(404).json({ message: 'Checklist item not found' });
    }

    // Delete the item
    await prisma.checklistItem.delete({
      where: { id: checklistItemId },
    });

    // Reorder remaining items to maintain continuous order values
    const remainingItems = await prisma.checklistItem.findMany({
      where: { projectId: item.projectId },
      orderBy: { order: 'asc' },
    });

    // Update order values
    for (let i = 0; i < remainingItems.length; i++) {
      await prisma.checklistItem.update({
        where: { id: remainingItems[i].id },
        data: { order: i },
      });
    }

    // Fetch the updated list
    const updatedItems = await prisma.checklistItem.findMany({
      where: { projectId: item.projectId },
      orderBy: { order: 'asc' },
    });

    const completedCount = updatedItems.filter(item => item.is_complete).length;

    // Return data in the format expected by useChecklist hook
    const responseData = {
      tasks: updatedItems,
      completed_tasks: completedCount,
      total_tasks: updatedItems.length,
    };

    res.status(200).json(responseData);
  } catch (error) {
    console.error(`Failed to delete checklist item ${checklistItemId}:`, error);
    res.status(500).json({ message: 'Failed to delete checklist item' });
  }
} 