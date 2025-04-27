'use client';

import { useState } from 'react';
import { useChecklist } from '@/hooks/useChecklist';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ChecklistModal } from './ChecklistModal';

interface ChecklistPreviewProps {
  projectId: string;
}

export function ChecklistPreview({ projectId }: ChecklistPreviewProps) {
  const { data, isLoading, error } = useChecklist(projectId);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-4 border rounded-md flex items-center justify-center text-muted-foreground">
         <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Checklist...
      </div>
    );
  }

  if (error || !data || data.total_tasks === 0) {
    // Don't show preview if error, no data, or checklist is empty
    // Optionally show an error message: if (error) return <p>Error loading checklist</p>; 
    return null; 
  }

  const { tasks, completed_tasks, total_tasks } = data;
  const progress = total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0;
  const firstThreeTasks = tasks.slice(0, 3);

  return (
    <>
        <div className="space-y-3 border-t pt-4 mt-4">
            <h4 className="text-sm font-medium leading-none mb-2">Launch Checklist</h4>
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
            {/* Task List Preview */}
            <ul className="space-y-2">
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
              {tasks.length > 3 && (
                 <li className="text-xs text-muted-foreground pl-6">... and {tasks.length - 3} more</li>
              )}
            </ul>
            {/* Button to trigger the modal */}
            <Button 
                variant="link" 
                className="text-sm text-blue-600 hover:underline p-0 h-auto pt-1" 
                onClick={() => setIsModalOpen(true)}
            >
                View Full Checklist →
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