import { useState, useEffect, useCallback } from 'react';
import supabase from '@/lib/supabase-client';

// Mock data structure - adjust as needed when backend is ready
export interface ChecklistTask {
  id: string;
  title: string;
  is_complete: boolean;
  ai_help_hint?: string | null;
}

export interface ChecklistData {
  tasks: ChecklistTask[];
  total_tasks: number;
  completed_tasks: number;
}

/**
 * Normalizes a UUID string to ensure it has the standard format with hyphens
 * @param id The UUID string to normalize
 * @returns Properly formatted UUID with hyphens
 */
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

// Hook implementation using fetch
export function useChecklist(projectId: string): {
  data: ChecklistData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  setData: React.Dispatch<React.SetStateAction<ChecklistData | null>>;
} {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Wrap fetch logic in a useCallback to ensure stable function reference
  const fetchData = useCallback(async () => {
    if (!projectId) {
      console.log('[useChecklist] No projectId provided, skipping fetch');
      setIsLoading(false);
      setData(null);
      setError(null);
      return;
    }

    console.log('[useChecklist] Fetching data for projectId:', projectId, 'Type:', typeof projectId);
    setIsLoading(true);
    setError(null);

    try {
      // Format the UUID properly to ensure consistent querying
      const formattedProjectId = normalizeUUID(projectId);
      console.log('[useChecklist] Using formatted project ID:', formattedProjectId);
      
      // Query checklist items directly from Supabase
      const { data: items, error: supabaseError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('project_id', formattedProjectId)
        .order('order', { ascending: true });
        
      if (supabaseError) {
        console.error("[useChecklist] Supabase error:", supabaseError);
        throw supabaseError;
      }
      
      // DEBUG: Log all checklist items in the database to help diagnose issues
      try {
        const { data: allItems } = await supabase
          .from('checklist_items')
          .select('*');
          
        console.log('[useChecklist] All checklist items in DB:', allItems?.length);
        if (allItems && allItems.length > 0) {
          console.log('[useChecklist] First few items:', allItems.slice(0, 3));
          
          const projectIds = [...new Set(allItems.map(i => i.project_id))];
          console.log('[useChecklist] All unique project_ids in DB:', projectIds);
          
          // Check if our projectId exists in any form in the database
          const normalizedIds = projectIds.map(id => normalizeUUID(id));
          const projectIdExists = normalizedIds.includes(formattedProjectId);
          console.log('[useChecklist] Our project ID exists in DB:', projectIdExists);
        }
      } catch (allItemsError) {
        console.error('[useChecklist] Error fetching all items:', allItemsError);
      }
      
      if (items && Array.isArray(items)) {
        console.log("[useChecklist] Supabase found items:", items.length, items);
        // Format the data to match the expected ChecklistData format
        const completedCount = items.filter(item => item.is_complete).length;
        const formattedData: ChecklistData = {
          tasks: items.map(item => ({
            id: item.id,
            title: item.title,
            is_complete: item.is_complete,
            ai_help_hint: item.ai_help_hint
          })),
          completed_tasks: completedCount,
          total_tasks: items.length
        };
        setData(formattedData);
      } else {
        console.log("[useChecklist] No items found for project ID:", formattedProjectId);
        // No items found, but not an error
        setData({
          tasks: [],
          completed_tasks: 0,
          total_tasks: 0
        });
      }
    } catch (err) {
      console.error("[useChecklist] Supabase query failed:", err);
      setError(err instanceof Error ? err : new Error('Failed to load checklist'));
      // Don't set data to null here to maintain previous data if available
    } finally {
      setIsLoading(false);
    }
  }, [projectId]); // Dependency: only refetch automatically if projectId changes

  // Initial fetch on mount or when projectId changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Return state, refetch function, AND setData function
  return { data, isLoading, error, refetch: fetchData, setData };
} 