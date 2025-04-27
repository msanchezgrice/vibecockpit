'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChecklist } from '@/hooks/useChecklist';
import {
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogClose, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from 'lucide-react';
import { AskAIDrawer } from './AskAIDrawer';

interface ChecklistModalProps {
  projectId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Function to calculate progress (can be moved to utils)
const calculateProgress = (completed: number, total: number): number => {
  return total > 0 ? (completed / total) * 100 : 0;
};

export function ChecklistModal({ projectId, isOpen, onOpenChange }: ChecklistModalProps) {
  const router = useRouter();
  const { data, isLoading, error } = useChecklist(projectId);
  const [isUpdatingTask, setIsUpdatingTask] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Handle state internally based on props
  const [isModalOpen, setIsModalOpen] = useState(isOpen);

  useEffect(() => {
    setIsModalOpen(isOpen);
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    onOpenChange(open); // Notify parent
  };

  const progress = data ? calculateProgress(data.completed_tasks, data.total_tasks) : 0;

  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    setIsUpdatingTask(taskId);
    setToggleError(null);
    try {
      const response = await fetch(`/api/checklist/${taskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: !currentStatus }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to toggle task');
      }
      router.refresh();
    } catch(err) {
      console.error("Failed to toggle task:", err);
      setToggleError(`Failed for task ${taskId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingTask(null);
    }
  };

  const handleAcceptAIDraft = async (taskId: string, draft: string) => {
    console.log(`Saving draft for task ${taskId}:`, draft);

    try {
      const response = await fetch(`/api/checklist/${taskId}/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draft }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to save AI draft');
      }
      console.log('AI Draft saved successfully');
    } catch(err) {
      console.error("Failed to save AI draft:", err);
    }
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Launch Checklist</DialogTitle>
          {data && (
             <DialogDescription>
                {data.completed_tasks} of {data.total_tasks} tasks complete.
             </DialogDescription>
          )}
        </DialogHeader>
        
        {/* Progress Bar */}
        {data && data.total_tasks > 0 && (
          <div className="mt-2 mb-4">
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                  <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                  />
            </div>
          </div>
        )}
        
        {/* Scrollable Task List */}
        <ScrollArea className="flex-grow border rounded-md p-1 mb-4"> 
          <div className="p-3">
            {isLoading && (
                <div className="flex items-center justify-center text-muted-foreground p-6">
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Tasks...
                </div>
            )}
            {error && <p className="text-red-500 text-center p-6">Error loading checklist: {error.message}</p>}
            {data && data.tasks.length > 0 && (
                <ul className="space-y-3">
                    {data.tasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between gap-4 p-2 rounded hover:bg-muted/50">
                           <div className="flex items-center gap-3">
                             <Checkbox 
                                id={`task-${task.id}`} 
                                checked={task.is_complete}
                                onCheckedChange={() => handleToggleTask(task.id, task.is_complete)}
                                disabled={isUpdatingTask === task.id}
                             />
                             <label htmlFor={`task-${task.id}`} className={`text-sm ${task.is_complete ? 'text-muted-foreground line-through' : ''}`}>
                                {task.title}
                             </label>
                             {task.ai_help_hint && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 text-xs px-1.5 py-0.5">AI</Badge>
                             )}
                            </div>
                            {isUpdatingTask === task.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>}
                            <AskAIDrawer 
                                taskId={task.id} 
                                taskTitle={task.title} 
                                initialHint={task.ai_help_hint} 
                                onAccept={handleAcceptAIDraft} 
                            />
                        </li>
                    ))}
                </ul>
            )}
            {toggleError && <p className="text-xs text-red-500 mt-2 text-center">{toggleError}</p>}
            {data && data.tasks.length === 0 && (
                <p className="text-center text-muted-foreground p-6">No checklist items found.</p>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Close Button */}
        <DialogFooter className="mt-auto pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 