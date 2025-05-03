'use client';

import { useState, useEffect } from 'react';
// import { useRouter } from 'next/navigation'; // Removed unused import
import { useChecklist } from '@/hooks/useChecklist';
import {
  Dialog, DialogContent, DialogDescription, 
  DialogHeader, DialogTitle, DialogClose, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Loader2, Trash2, Plus } from 'lucide-react';
import { AskAIModal } from './AskAIModal';
import { Input } from "@/components/ui/input";

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
  // const router = useRouter(); // Removed unused router
  // Get setData from the hook, remove unused refetch for now
  const { data, isLoading, error, setData } = useChecklist(projectId); 
  const [isUpdatingTask, setIsUpdatingTask] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState<string | null>(null);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);

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
    console.log(`[ChecklistModal] Toggling task ${taskId} from ${currentStatus} to ${!currentStatus}`);
    setIsUpdatingTask(taskId);
    setToggleError(null); // Clear previous errors
    let response: Response | null = null; // Declare response variable
    try {
      response = await fetch(`/api/checklist/${taskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: !currentStatus }),
      });

      console.log(`[ChecklistModal] API response status for ${taskId}: ${response.status}`);
      console.log(`[ChecklistModal] API response ok for ${taskId}: ${response.ok}`);

      // Only attempt to parse JSON if the response is OK and likely has content
      if (response.ok) {
        const updatedItem = await response.json(); 
        console.log(`[ChecklistModal] Toggle API success for ${taskId}:`, updatedItem); 
        
        // --- Manual State Update --- 
        setData(currentData => {
           if (!currentData) return null; // Should not happen if toggle is possible
           
           // Find index and create new tasks array
           const taskIndex = currentData.tasks.findIndex(t => t.id === taskId);
           if (taskIndex === -1) return currentData; // Task not found?
           
           const newTasks = [
              ...currentData.tasks.slice(0, taskIndex),
              updatedItem, // Insert the updated item from API response
              ...currentData.tasks.slice(taskIndex + 1),
           ];

           // Recalculate counts
           const newCompletedCount = newTasks.filter(t => t.is_complete).length;

           // Return NEW state object
           return {
              ...currentData,
              tasks: newTasks,
              completed_tasks: newCompletedCount,
              // total_tasks presumably doesn't change on toggle
           };
        });
        // --- End Manual State Update ---

        // refetch(); // No longer strictly needed for immediate UI update, but can keep for consistency

      } else {
        // Try to parse error message if not ok
        let errorResult = { message: 'Failed to toggle task' };
        try {
          errorResult = await response.json();
        } catch (jsonError) {
            console.warn(`[ChecklistModal] Could not parse JSON from error response for ${taskId}:`, jsonError);
        }
        console.error(`[ChecklistModal] Toggle API failed for ${taskId}:`, errorResult);
        throw new Error(errorResult.message || 'Failed to toggle task'); 
      }
    } catch(err) {
      console.error(`[ChecklistModal] Error in handleToggleTask for ${taskId}. Response status: ${response?.status}`, err);
      setToggleError(`Failed for task ${taskId}: ${err instanceof Error ? err.message : 'Unknown error'}`); 
    } finally {
      setIsUpdatingTask(null); // Stop showing loader
    }
  };

  const handleAcceptAIDraft = async (taskId: string, draft: string) => {
    console.log(`[ChecklistModal] Saving draft for task ${taskId}`);

    try {
      const response = await fetch(`/api/checklist/${taskId}/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draft }),
      });
      const result = await response.json();
      if (!response.ok) {
        console.error(`[ChecklistModal] Save Draft API failed for ${taskId}:`, result);
        throw new Error(result.message || 'Failed to save AI draft');
      }
      console.log(`[ChecklistModal] Save Draft API success for ${taskId}:`, result);
    } catch(err) {
      console.error(`[ChecklistModal] Error in handleAcceptAIDraft for ${taskId}:`, err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setIsAddingTask(true);
    setAddTaskError(null);
    
    try {
      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          title: newTaskTitle.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add task');
      }
      
      const updatedData = await response.json();
      setData(updatedData);
      setNewTaskTitle(''); // Clear input after successful add
      
    } catch (err) {
      console.error('Error adding task:', err);
      setAddTaskError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsDeletingTask(taskId);
    
    try {
      const response = await fetch(`/api/checklist/${taskId}/delete`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }
      
      const updatedData = await response.json();
      setData(updatedData);
      
    } catch (err) {
      console.error(`Error deleting task ${taskId}:`, err);
      setToggleError(`Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeletingTask(null);
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
        
        {/* Add Task Form */}
        <form onSubmit={handleAddTask} className="flex items-center gap-2 my-4">
          <Input
            type="text"
            placeholder="Add new task..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={isAddingTask}
            className="flex-grow"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={isAddingTask || !newTaskTitle.trim()}
            className="px-3"
          >
            {isAddingTask ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" /> Add
              </>
            )}
          </Button>
        </form>
        {addTaskError && <p className="text-xs text-red-500 mt-1 mb-2">{addTaskError}</p>}
        
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
                            <div className="flex items-center gap-2">
                              {isUpdatingTask === task.id || isDeletingTask === task.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground"/>
                              ) : (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-7 w-7 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    onClick={() => handleDeleteTask(task.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <AskAIModal 
                                    taskId={task.id} 
                                    taskTitle={task.title} 
                                    initialHint={task.ai_help_hint} 
                                    onAccept={handleAcceptAIDraft} 
                                  />
                                </>
                              )}
                            </div>
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