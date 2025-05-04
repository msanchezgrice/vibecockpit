'use client';

import { useState, useEffect } from 'react';
import { useChecklist } from '@/hooks/useChecklist';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ChecklistModal } from './ChecklistModal';

interface ChecklistPreviewProps {
  projectId: string;
}

export function ChecklistPreview({ projectId }: ChecklistPreviewProps) {
  const { data, isLoading, error, refetch } = useChecklist(projectId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('[ChecklistPreview] Rendering with data:', { 
      projectId, 
      isLoading, 
      error: error?.message, 
      hasData: !!data,
      taskCount: data?.tasks?.length,
      tasks: data?.tasks
    });
  }, [projectId, isLoading, error, data]);

  if (isLoading) {
    console.log('[ChecklistPreview] Showing loading state');
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium leading-none mb-2">Launch Checklist</h4>
        <div className="p-4 border rounded-md flex flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mb-2" /> 
          <p className="text-sm text-center">Loading launch checklist...</p>
          <p className="text-xs text-muted-foreground">Project ID: {projectId.substring(0, 8)}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("[ChecklistPreview] Rendering error fallback:", error);
    // Show a fallback UI instead of returning null
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium leading-none mb-2">Launch Checklist</h4>
        <div className="p-4 border rounded-md flex flex-col items-center justify-center">
          <AlertCircle className="h-5 w-5 text-amber-500 mb-2" />
          <p className="text-sm text-center font-medium">Failed to load checklist data</p>
          <p className="text-sm text-center mt-1">
            To enable checklists, set project status to &quot;Preparing to Launch&quot; in the dropdown above.
          </p>
          <div className="flex space-x-2 mt-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
            >
              Try Again
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="text-xs"
            >
              View Checklist Tools
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Make sure we accurately check if tasks exist
  const hasTasks = data && data.tasks && data.tasks.length > 0;
  console.log("[ChecklistPreview] Has tasks:", hasTasks, "Count:", data?.tasks?.length || 0);

  // If we have data but no tasks, show a message
  if (!hasTasks) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium leading-none mb-2">Launch Checklist</h4>
        <div className="p-4 border rounded-md bg-amber-50 dark:bg-amber-950/20">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
            No checklist items found
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            Set status to &quot;Preparing to Launch&quot; in the dropdown above to generate a checklist automatically.
          </p>
          <Button 
            variant="outline" 
            className="text-xs mt-3" 
            onClick={() => setIsModalOpen(true)}
          >
            View Checklist Tools
          </Button>
        </div>
      </div>
    );
  }

  // If we reach this point, we have tasks to display
  const completed_tasks = data?.completed_tasks ?? 0;
  const total_tasks = data?.total_tasks ?? 0;
  const progress = total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0;
  const firstThreeTasks = data?.tasks?.slice(0, 3) ?? [];

  console.log('[ChecklistPreview] Rendering tasks:', { hasTasks, completed_tasks, total_tasks, progress, firstThreeTasks });

  return (
    <>
      <div className="space-y-3">
        <h4 className="text-sm font-medium leading-none mb-2">Launch Checklist</h4>
        
        {/* Progress Section */} 
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
          <span>Progress</span>
          <span>{completed_tasks} / {total_tasks}</span>
        </div>
        {/* Progress Bar */}
        <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
          <div 
            className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Task List */} 
        <ul className="space-y-2 mt-2">
          {firstThreeTasks.map(task => (
            <li key={task.id} className="flex items-center gap-2 text-sm">
              {task.is_complete ? 
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" /> : 
                <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              }
              <span className={task.is_complete ? 'text-muted-foreground line-through' : ''}> 
                {task.title}
              </span>
            </li>
          ))}
          {data.tasks.length > 3 && (
            <li className="text-xs text-muted-foreground pl-6">... and {data.tasks.length - 3} more</li>
          )}
        </ul>
        
        {/* Button to trigger the modal */}
        <Button 
          variant="secondary" 
          className="text-sm w-full mt-2" 
          onClick={() => setIsModalOpen(true)}
        >
          View Full Checklist
        </Button>
      </div>
      
      {/* Render the Modal (controlled) */}
      <ChecklistModal 
        projectId={projectId} 
        isOpen={isModalOpen} 
        onOpenChange={setIsModalOpen} 
      />
    </>
  );
} 