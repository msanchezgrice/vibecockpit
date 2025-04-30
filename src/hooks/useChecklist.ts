import { useState, useEffect, useCallback } from 'react';

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
  const fetchData = useCallback(() => {
    if (!projectId) {
      setIsLoading(false);
      setData(null); // No project ID, no data
      setError(null);
      return;
    }

    console.log('[useChecklist] Fetching data...'); // Log fetch start
    setIsLoading(true);
    setError(null);

    fetch(`/api/checklist?projectId=${encodeURIComponent(projectId)}`)
      .then(res => {
        if (!res.ok) {
          return res.json().then(errData => {
             throw new Error(errData.message || `HTTP error! status: ${res.status}`);
          }).catch(() => {
             throw new Error(`HTTP error! status: ${res.status}`);
          });
        }
        return res.json();
      })
      .then(fetchedData => {
        console.log('[useChecklist] Fetched data successful:', fetchedData);
        setData(fetchedData as ChecklistData);
      })
      .catch(err => {
        console.error("[useChecklist] Failed to fetch checklist:", err);
        setError(err instanceof Error ? err : new Error('Failed to load checklist'));
        setData(null);
      })
      .finally(() => {
        setIsLoading(false); // Ensure loading is set to false in both success and error cases
      });
    // Note: isMounted cleanup is generally not needed with useCallback/useEffect correctly used
  }, [projectId]); // Dependency: only refetch automatically if projectId changes

  // Initial fetch on mount or when projectId changes
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Depend on the stable fetchData function

  // Return state, refetch function, AND setData function
  return { data, isLoading, error, refetch: fetchData, setData };
} 