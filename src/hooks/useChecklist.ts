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

// Define interface for API response task items
interface ApiTaskItem {
  id: string;
  title: string;
  is_complete: boolean;
  ai_help_hint?: string | null;
  order?: number;
  project_id?: string;
}

/**
 * Normalizes a UUID string to ensure it has the standard format with hyphens
 * @param id The UUID string to normalize
 * @returns Properly formatted UUID with hyphens
 */
function normalizeUUID(id: string): string {
  // Log the input for debugging
  console.log('[normalizeUUID] Input:', id, 'Type:', typeof id);
  
  // Handle invalid or empty inputs
  if (!id || typeof id !== 'string') {
    console.error('[normalizeUUID] Invalid input:', id);
    return '';
  }
  
  // If it already has hyphens, return as is
  if (id.includes('-')) {
    console.log('[normalizeUUID] Already has hyphens, returning as is:', id);
    return id;
  }
  
  // If it's a 32-character string without hyphens, format it as UUID
  if (id.length === 32) {
    const formatted = `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
    console.log('[normalizeUUID] Formatted 32-char ID as UUID:', formatted);
    return formatted;
  }
  
  // Return original if it doesn't match UUID pattern
  console.log('[normalizeUUID] Not a standard UUID pattern, returning original:', id);
  return id;
}

// Hook implementation using direct fetch if Supabase fails
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
      
      // Skip if we couldn't format the ID properly
      if (!formattedProjectId) {
        console.error('[useChecklist] Failed to normalize project ID');
        throw new Error('Invalid project ID format');
      }
      
      console.log('[useChecklist] Using formatted project ID:', formattedProjectId);
      
      // First try to fetch via direct API using fetch
      try {
        console.log('[useChecklist] Trying direct API call');
        
        const apiUrl = '/api/checklist';
        const response = await fetch(`${apiUrl}?projectId=${formattedProjectId}`);
        
        if (!response.ok) {
          console.error('[useChecklist] API request failed:', response.status, response.statusText);
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const apiData = await response.json();
        console.log('[useChecklist] API data:', apiData);
        
        if (apiData && apiData.tasks) {
          const formattedData: ChecklistData = {
            tasks: apiData.tasks.map((item: ApiTaskItem) => ({
              id: item.id,
              title: item.title,
              is_complete: item.is_complete,
              ai_help_hint: item.ai_help_hint
            })),
            completed_tasks: apiData.tasks.filter((item: ApiTaskItem) => item.is_complete).length,
            total_tasks: apiData.tasks.length
          };
          
          setData(formattedData);
          setIsLoading(false);
          return;
        }
      } catch (apiError) {
        console.error('[useChecklist] API request failed:', apiError);
        // If API fails, try Supabase directly
      }
      
      // Try to fetch the checklist items with better error handling
      try {
        // Get a fresh Supabase client instance with current auth
        const { data: items, error: supabaseError, status } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('project_id', formattedProjectId)
          .order('order', { ascending: true });
          
        // Log the response for debugging
        console.log('[useChecklist] Supabase response:', { 
          status, 
          error: supabaseError?.message, 
          itemCount: items?.length || 0
        });
        
        if (supabaseError) {
          console.error("[useChecklist] Supabase error:", supabaseError);
          throw supabaseError;
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
          setIsLoading(false);
          return; // Success path - exit early
        }
      } catch (fetchError) {
        console.error("[useChecklist] Error fetching checklist items:", fetchError);
        // Continue to fallback strategy
      }
      
      // Try a different query to see if checklist items exist for this project
      try {
        console.log('[useChecklist] Trying alternative query with direct ID');
        const { data: directItems, error: directError } = await supabase
          .from('checklist_items')
          .select('count')
          .eq('project_id', projectId); // Try with original ID just in case
          
        console.log('[useChecklist] Direct query result:', { data: directItems, error: directError });
      } catch (altError) {
        console.error('[useChecklist] Alternative query failed:', altError);
      }
      
      // Fallback: Try to create a test checklist via API
      try {
        console.log('[useChecklist] No items found. Attempting to create test checklist.');
        const createResponse = await fetch('/api/create-test-checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: formattedProjectId, itemCount: 3 })
        });
        
        if (createResponse.ok) {
          const createResult = await createResponse.json();
          console.log('[useChecklist] Test checklist created:', createResult);
          
          // Retry fetching after creating test data
          const response = await fetch(`/api/checklist?projectId=${formattedProjectId}`);
          
          if (response.ok) {
            const apiData = await response.json();
            if (apiData && apiData.tasks) {
              const formattedData: ChecklistData = {
                tasks: apiData.tasks.map((item: ApiTaskItem) => ({
                  id: item.id,
                  title: item.title,
                  is_complete: item.is_complete,
                  ai_help_hint: item.ai_help_hint
                })),
                completed_tasks: apiData.tasks.filter((item: ApiTaskItem) => item.is_complete).length,
                total_tasks: apiData.tasks.length
              };
              
              setData(formattedData);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (createError) {
        console.error('[useChecklist] Failed to create test checklist:', createError);
      }
      
      // After all attempts, we didn't find items for this project
      console.log("[useChecklist] No items found for project ID:", formattedProjectId);
      // No items found, but not an error - return an empty list
      setData({
        tasks: [],
        completed_tasks: 0,
        total_tasks: 0
      });
    } catch (err) {
      console.error("[useChecklist] Query failed:", err);
      setError(err instanceof Error ? err : new Error('Failed to load checklist data'));
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