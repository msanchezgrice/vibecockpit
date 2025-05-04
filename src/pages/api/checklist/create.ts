import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import supabase from '@/lib/supabase-client';

// Schema to validate request body
const createItemSchema = z.object({
  projectId: z.string().min(1, { message: "Project ID is required" }),
  title: z.string().min(1, { message: "Task title is required" }).max(200),
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
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Validate request body
    const { projectId, title } = createItemSchema.parse(req.body);
    console.log('[API] Creating checklist item:', { projectId, title });
    
    // Format projectId
    const formattedProjectId = normalizeUUID(projectId);
    console.log('[API] Formatted projectId:', formattedProjectId);
    
    // Try to get the current max order
    let maxOrder = 0;
    
    try {
      // Try with Prisma
      const maxOrderItem = await prisma.checklistItem.findFirst({
        where: { projectId: formattedProjectId },
        orderBy: { order: 'desc' },
        select: { order: true }
      });
      
      if (maxOrderItem) {
        maxOrder = maxOrderItem.order + 1;
      }
    } catch (prismaError) {
      console.error('[API] Prisma query failed:', prismaError);
      
      // Try with Supabase
      try {
        const { data, error } = await supabase
          .from('checklist_items')
          .select('order')
          .eq('project_id', formattedProjectId)
          .order('order', { ascending: false })
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          maxOrder = data[0].order + 1;
        }
      } catch (supabaseError) {
        console.error('[API] Supabase query failed:', supabaseError);
        // Continue with default order 0
      }
    }
    
    // Create new item
    try {
      // Try with Prisma first
      const newItem = await prisma.checklistItem.create({
        data: {
          projectId: formattedProjectId,
          title,
          order: maxOrder,
          is_complete: false
        }
      });
      
      return res.status(201).json({
        success: true,
        item: newItem,
        source: 'prisma'
      });
    } catch (prismaError) {
      console.error('[API] Prisma create failed:', prismaError);
      
      // Try with Supabase
      const { data, error } = await supabase
        .from('checklist_items')
        .insert({
          project_id: formattedProjectId,
          title,
          order: maxOrder,
          is_complete: false
        })
        .select();
        
      if (error) throw error;
      
      return res.status(201).json({
        success: true,
        item: data?.[0] || null,
        source: 'supabase'
      });
    }
  } catch (error) {
    console.error('[API] Error creating checklist item:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Invalid request data',
        details: error.errors
      });
    }
    
    return res.status(500).json({
      message: 'Failed to create checklist item',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 