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
import { toast } from "@/components/ui/use-toast";

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
  const { data, isLoading, error, setData, refetch } = useChecklist(projectId); 
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

  useEffect(() => {
    // When modal opens, refresh the data
    if (isOpen) {
      console.log('[ChecklistModal] Modal opened, refreshing data for projectId:', projectId);
      refetch();
    }
  }, [isOpen, projectId, refetch]);

  const handleOpenChange = (open: boolean) => {
    setIsModalOpen(open);
    onOpenChange(open); // Notify parent
  };

  // Calculate progress with fallback values
  const progress = data ? calculateProgress(data.completed_tasks, data.total_tasks) : 0;

  // Function to handle toggling a task's completion status
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    console.log(`[ChecklistModal] Toggling task ${taskId} from ${currentStatus} to ${!currentStatus}`);
    
    if (isUpdatingTask) return; // Prevent multiple simultaneous updates
    
    setIsUpdatingTask(taskId);
    setToggleError(null);
    
    try {
      // First try the Next.js API route
      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          taskId, 
          isComplete: !currentStatus
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      // Update the local state to reflect the change immediately
      if (data) {
        const updatedTasks = data.tasks.map(task => 
          task.id === taskId 
            ? { ...task, is_complete: !currentStatus } 
            : task
        );
        
        const completedCount = updatedTasks.filter(task => task.is_complete).length;
        
        setData({
          tasks: updatedTasks,
          completed_tasks: completedCount,
          total_tasks: data.total_tasks
        });
      }
      
      console.log(`[ChecklistModal] Successfully toggled task ${taskId}`);
    } catch (error) {
      console.error('[ChecklistModal] Error toggling task:', error);
      setToggleError(`Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingTask(null);
    }
  };

  // Function to handle adding a new task
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || isAddingTask) return;
    
    setIsAddingTask(true);
    setAddTaskError(null);
    
    try {
      // Call the API to add a new task
      const response = await fetch('/api/checklist/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          title: newTaskTitle.trim() 
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add task: ${response.status}`);
      }
      
      // Reset the input field
      setNewTaskTitle('');
      
      // Refresh the checklist data
      refetch();
      
    } catch (error) {
      console.error('[ChecklistModal] Error adding task:', error);
      setAddTaskError(`Failed to add task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAddingTask(false);
    }
  };

  // Function to handle deleting a task
  const handleDeleteTask = async (taskId: string) => {
    if (isDeletingTask) return;
    
    setIsDeletingTask(taskId);
    
    try {
      // Call the API to delete the task
      const response = await fetch(`/api/checklist/${taskId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status}`);
      }
      
      // Update the local state
      if (data) {
        const updatedTasks = data.tasks.filter(task => task.id !== taskId);
        const completedCount = updatedTasks.filter(task => task.is_complete).length;
        
        setData({
          tasks: updatedTasks,
          completed_tasks: completedCount,
          total_tasks: updatedTasks.length
        });
      }
      
    } catch (error) {
      console.error('[ChecklistModal] Error deleting task:', error);
      toast({
        title: 'Error',
        description: `Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsDeletingTask(null);
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
      
      // Update local state to reflect the saved draft
      setData(currentData => {
        if (!currentData) return null;
        
        // Find the task and update its ai_help_hint
        const updatedTasks = currentData.tasks.map(task => {
          if (task.id === taskId) {
            return { ...task, ai_help_hint: draft };
          }
          return task;
        });
        
        return {
          ...currentData,
          tasks: updatedTasks
        };
      });
      
    } catch(err) {
      console.error(`[ChecklistModal] Error in handleAcceptAIDraft for ${taskId}:`, err);
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
            placeholder={isAddingTask ? "Adding task..." : "Add new task..."}
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            disabled={isAddingTask}
            className={isAddingTask ? "animate-pulse" : ""}
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
                <div className="flex flex-col items-center justify-center text-muted-foreground p-6">
                    <Loader2 className="h-8 w-8 animate-spin mb-3" /> 
                    <p className="text-center">OpenAI is generating your launch checklist...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
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
                                  
                                  {/* Pass task title as taskReasoning to ensure "Ask AI for help" button shows up */}
                                  <AskAIModal 
                                    taskId={task.id} 
                                    taskTitle={task.title}
                                    initialHint={task.ai_help_hint} 
                                    taskReasoning={task.title}
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