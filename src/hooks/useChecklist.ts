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

// Mock hook implementation
export function useChecklist(projectId: string): { data: ChecklistData | null, isLoading: boolean, error: Error | null } {
  const [data, setData] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Simulate fetching data
    setIsLoading(true);
    setError(null);
    
    // Only return mock data for a specific project ID for testing, or remove check
    // if (projectId !== 'some-test-project-id') { 
    //     setData(null);
    //     setIsLoading(false);
    //     return;
    // }

    // Simulate network delay
    const timer = setTimeout(() => {
        // Sample Data
        const mockData: ChecklistData = {
            tasks: [
                { id: 't1', title: 'Configure DNS', is_complete: true },
                { id: 't2', title: 'Set up monitoring', is_complete: true },
                { id: 't3', title: 'Run performance audit', is_complete: false },
                { id: 't4', title: 'Final stakeholder sign-off', is_complete: false, ai_help_hint: 'Draft an email...' },
                { id: 't5', title: 'Schedule social media posts', is_complete: false },
            ],
            total_tasks: 12, // Example total
            completed_tasks: 2 // Example completed
        };
        setData(mockData);
        setIsLoading(false);
    }, 500); // 0.5 second delay

    return () => clearTimeout(timer); // Cleanup timer on unmount

  }, [projectId]); // Re-run if projectId changes

  return { data, isLoading, error };
} 