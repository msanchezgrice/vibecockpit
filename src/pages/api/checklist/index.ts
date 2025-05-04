import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma'; // Import singleton instance
import { z } from 'zod';
import supabase from '@/lib/supabase-client';

// const prisma = new PrismaClient(); // Remove direct instantiation

// Schema to validate query parameters
const querySchema = z.object({
  // Allow both UUID format and non-UUID format for flexibility
  projectId: z.string().min(1, { message: "Project ID cannot be empty" }),
});

// Function to normalize UUID
function normalizeUUID(id: string): string {  
  // If it already has hyphens, return as is
  if (id.includes('-')) return id;
  
  // If it's a 32-character string without hyphens, format it as UUID
  if (id.length === 32) {
    return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
  }
  
  // Return original if it doesn't match UUID pattern
  return id;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log("[API] /api/checklist called with method:", req.method);
  
  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // Handle GET request to fetch checklist
  if (req.method === 'GET') {
    try {
      // Validate the projectId query parameter
      const { projectId } = querySchema.parse(req.query);
      console.log("[API] Getting checklist for projectId:", projectId);
      
      // Format the UUID properly
      const formattedProjectId = normalizeUUID(projectId);
      console.log("[API] Formatted projectId:", formattedProjectId);
      
      // Try to fetch from the database directly first
      try {
        const items = await prisma.checklistItem.findMany({
          where: { projectId: formattedProjectId },
          orderBy: { order: 'asc' },
        });
        
        console.log(`[API] Found ${items.length} items in database`);
        return res.status(200).json({ 
          tasks: items,
          count: items.length,
          source: 'prisma'
        });
      } catch (prismaError) {
        console.error("[API] Prisma query failed:", prismaError);
        // Fall through to try Supabase
      }
      
      // If Prisma fails, try Supabase
      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('project_id', formattedProjectId)
        .order('order', { ascending: true });
        
      if (error) {
        console.error("[API] Supabase query failed:", error);
        throw error;
      }
      
      console.log(`[API] Found ${items?.length || 0} items via Supabase`);
      
      // Return the items
      return res.status(200).json({ 
        tasks: items || [],
        count: items?.length || 0,
        source: 'supabase'
      });
      
    } catch (error) {
      console.error('[API] Error getting checklist:', error);
      return res.status(500).json({ 
        message: 'Failed to get checklist',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // Handle POST request to toggle task completion
  if (req.method === 'POST') {
    try {
      const { taskId, isComplete } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ message: 'Task ID is required' });
      }
      
      // Try Prisma first
      try {
        const updatedTask = await prisma.checklistItem.update({
          where: { id: taskId },
          data: { is_complete: isComplete ?? false },
        });
        
        return res.status(200).json({
          success: true,
          task: updatedTask,
          source: 'prisma'
        });
      } catch (prismaError) {
        console.error("[API] Prisma update failed:", prismaError);
        // Fall through to try Supabase
      }
      
      // If Prisma fails, try Supabase
      const { data, error } = await supabase
        .from('checklist_items')
        .update({ is_complete: isComplete ?? false })
        .eq('id', taskId)
        .select();
        
      if (error) {
        console.error("[API] Supabase update failed:", error);
        throw error;
      }
      
      return res.status(200).json({
        success: true,
        task: data?.[0] || null,
        source: 'supabase'
      });
      
    } catch (error) {
      console.error('[API] Error updating task:', error);
      return res.status(500).json({ 
        message: 'Failed to update task',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
} 