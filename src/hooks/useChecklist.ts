import { useState, useEffect } from 'react';

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

// Hook implementation using fetch
export function useChecklist(projectId: string): { data: ChecklistData | null, isLoading: boolean, error: Error | null } {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!projectId) {
        setIsLoading(false);
        setData(null); // No project ID, no data
        return;
    }

    setIsLoading(true);
    setError(null);

    let isMounted = true; // Prevent state update on unmounted component

    fetch(`/api/checklist?projectId=${encodeURIComponent(projectId)}`)
      .then(res => {
        if (!res.ok) {
          // Try to parse error message from API
          return res.json().then(errData => {
             throw new Error(errData.message || `HTTP error! status: ${res.status}`);
          }).catch(() => {
             throw new Error(`HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(fetchedData => {
        console.log('[useChecklist] Fetched data:', fetchedData);
        if (isMounted) {
          setData(fetchedData as ChecklistData);
          setIsLoading(false);
        }
      })
      .catch(err => {
         console.error("[useChecklist] Failed to fetch checklist:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to load checklist'));
          setIsLoading(false);
          setData(null);
        }
      });

    return () => { isMounted = false }; // Cleanup function

  }, [projectId]); // Re-run if projectId changes

  return { data, isLoading, error };
} 