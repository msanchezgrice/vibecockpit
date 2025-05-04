'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Trash2, MessageSquareText, GitCommitHorizontal, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Project, ProjectStatus, CostSnapshot, AnalyticsSnapshot, ChangeLogEntry } from '@/generated/prisma';
import { formatDateTime } from '@/lib/utils'; // Assuming formatDateTime is reusable
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useChecklist } from '@/hooks/useChecklist';
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AskAIModal } from './AskAIModal';

// Define the expected prop type
type ProjectWithRelations = Project & { 
    costSnapshots: CostSnapshot[]; 
    analyticsSnapshots: AnalyticsSnapshot[]; 
    changelog: ChangeLogEntry[];
};

interface EditProjectDialogProps {
  project: ProjectWithRelations;
}

// Helper for icons
function ProviderIcon({ provider }: { provider: string }) {
    if (provider === 'note') return <MessageSquareText className="h-4 w-4 text-muted-foreground" />;
    if (provider === 'github_commit') return <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />;
    return null;
}

// Helper for commit message
function formatChangelogMessage(entry: ChangeLogEntry) {
    if (entry.provider === 'github_commit') {
        return entry.message.split('\n')[1] || entry.message;
    }
    return entry.message;
 }

// Function to calculate progress (can be moved to utils)
const calculateProgress = (completed: number, total: number): number => {
  return total > 0 ? (completed / total) * 100 : 0;
};

// Add types for fetched lists
interface GitHubRepoOption {
  id: number;
  full_name: string; // owner/repo
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // Form State
  const [projectName, setProjectName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [currentStatus, setCurrentStatus] = useState(project.status);
  const [frontendUrl, setFrontendUrl] = useState(project.frontendUrl ?? '');
  const [vercelId, setVercelId] = useState(project.vercelProjectId ?? '');
  const [githubRepo, setGithubRepo] = useState(project.githubRepo ?? '');
  const [newNoteText, setNewNoteText] = useState('');
  
  // State for Connect flows
  const [githubRepos, setGithubRepos] = useState<GitHubRepoOption[]>([]);
  const [loadingGitHub, setLoadingGitHub] = useState(false);
  const [popoverOpenGitHub, setPopoverOpenGitHub] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Checklist states
  const { data: checklistData, isLoading: checklistLoading, error: checklistError, setData: setChecklistData } = useChecklist(project.id);
  const [isUpdatingTask, setIsUpdatingTask] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState<string | null>(null);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);

  const checklistProgress = checklistData ? calculateProgress(checklistData.completed_tasks, checklistData.total_tasks) : 0;

  // Reset state when sheet opens/closes or project changes
  useEffect(() => {
    if (isOpen) {
        setProjectName(project.name);
        setDescription(project.description ?? '');
        setCurrentStatus(project.status);
        setFrontendUrl(project.frontendUrl ?? '');
        setVercelId(project.vercelProjectId ?? '');
        setGithubRepo(project.githubRepo ?? '');
        setNewNoteText('');
        setError(null);
        setNoteError(null);
        setConnectError(null); // Also reset connect error
    }
  }, [isOpen, project]);

  // --- Handlers ---
  const handleSaveChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setError(null);
    // Add validation if needed...
    const payload = { name: projectName, description, status: currentStatus, frontendUrl, vercelProjectId: vercelId, githubRepo };
    
    try {
      const response = await fetch(`/api/projects/${project.id}`, { 
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to save changes');
      setIsOpen(false); 
      router.refresh(); 
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim()) return;
    setIsAddingNote(true);
    setNoteError(null);
    try {
       const response = await fetch(`/api/projects/${project.id}/changelog`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: newNoteText }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to add note');
      setNewNoteText('');
      router.refresh(); // Refresh to show new note (and potentially update card)
    } catch (err: unknown) {
      setNoteError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null); // Clear main error
    try {
      const response = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
      if (!response.ok) {
         const result = await response.json().catch(() => ({}));
        throw new Error(result.message || 'Failed to delete project');
      }
      setIsOpen(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // Fetch GitHub Repos
  const fetchGitHubRepos = async () => {
    setLoadingGitHub(true);
    setConnectError(null);
    try {
      const res = await fetch('/api/github/repos');
      if (!res.ok) throw new Error('Failed to fetch GitHub repos');
      const data = await res.json();
      setGithubRepos(data);
       setPopoverOpenGitHub(true); // Open popover on successful fetch
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'GitHub fetch error');
    } finally {
      setLoadingGitHub(false);
    }
  };

  // Find display names for selected items
  const selectedGitHubRepoName = githubRepos.find(r => r.full_name === githubRepo)?.full_name ?? githubRepo;

  // Checklist handlers
  const handleToggleTask = async (taskId: string, currentStatus: boolean) => {
    setIsUpdatingTask(taskId);
    setToggleError(null); // Clear previous errors
    let response: Response | null = null; // Declare response variable
    try {
      response = await fetch(`/api/checklist/${taskId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: !currentStatus }),
      });

      // Only attempt to parse JSON if the response is OK and likely has content
      if (response.ok) {
        const updatedItem = await response.json(); 
        
        // --- Manual State Update --- 
        setChecklistData(currentData => {
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
           };
        });

      } else {
        // Try to parse error message if not ok
        let errorResult = { message: 'Failed to toggle task' };
        try {
          errorResult = await response.json();
        } catch (error) {
          // Log the JSON parsing error
          console.warn(`Could not parse JSON from error response for ${taskId}:`, error);
        }
        throw new Error(errorResult.message || 'Failed to toggle task'); 
      }
    } catch(err) {
      setToggleError(`Failed for task ${taskId}: ${err instanceof Error ? err.message : 'Unknown error'}`); 
    } finally {
      setIsUpdatingTask(null); // Stop showing loader
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
          projectId: project.id,
          title: newTaskTitle.trim()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add task');
      }
      
      const updatedData = await response.json();
      setChecklistData(updatedData);
      setNewTaskTitle(''); // Clear input after successful add
      
    } catch (err) {
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
      setChecklistData(updatedData);
      
    } catch (err) {
      setToggleError(`Failed to delete task: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDeletingTask(null);
    }
  };

  const handleAcceptAIDraft = async (taskId: string, draft: string) => {
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
      
      // Update local state to reflect the saved draft
      setChecklistData(currentData => {
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
      console.error(`Error in handleAcceptAIDraft for ${taskId}:`, err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"> 
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        <DialogHeader className="pr-6 flex-shrink-0">
          <DialogTitle className="text-xl">Edit Project: {projectName}</DialogTitle>
          <DialogDescription className="text-sm">View details, make changes, and add notes.</DialogDescription>
        </DialogHeader>

        {/* Hero Image Placeholder */}
        <div className="h-32 bg-muted rounded-md my-4 flex items-center justify-center text-muted-foreground flex-shrink-0">
            Hero Image Placeholder
        </div>

        <ScrollArea className="flex-grow overflow-y-auto pr-6 max-h-[calc(90vh-250px)]">
            <div className="grid gap-4 py-4">
                {/* --- Edit Fields --- */} 
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-name-${project.id}`} className="text-right text-sm">Name</Label>
                    <Input id={`edit-name-${project.id}`} value={projectName} onChange={(e) => setProjectName(e.target.value)} className="col-span-3 text-base h-10" required disabled={isSaving}/>
                </div>
                 <div className="grid grid-cols-4 items-start gap-4"> {/* Align start for textarea */}
                    <Label htmlFor={`edit-desc-${project.id}`} className="text-right text-sm pt-2">Description</Label>
                    <Textarea id={`edit-desc-${project.id}`} placeholder="(Optional)..." value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3 text-base min-h-[80px]" rows={3} disabled={isSaving}/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-status-${project.id}`} className="text-right text-sm">Status</Label>
                     <Select value={currentStatus} onValueChange={(v) => setCurrentStatus(v as ProjectStatus)} disabled={isSaving}>
                        <SelectTrigger className="col-span-3 h-10 text-base"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {Object.values(ProjectStatus).map((s) => (<SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-feUrl-${project.id}`} className="text-right text-sm">Frontend URL</Label>
                    <Input id={`edit-feUrl-${project.id}`} type="url" placeholder="https://... (Optional)" value={frontendUrl} onChange={(e) => setFrontendUrl(e.target.value)} className="col-span-3 text-base h-10" disabled={isSaving}/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-vercelId-${project.id}`} className="text-right text-sm">Vercel ID</Label>
                     {/* Simple Input, assumes user already connected account */}
                    <Input id={`edit-vercelId-${project.id}`} placeholder="Enter Vercel Project ID (Optional)" className="col-span-3 text-base h-10" value={vercelId} onChange={(e) => setVercelId(e.target.value)} disabled={isSaving}/> 
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right text-sm">GitHub Repo</Label>
                     <Popover open={popoverOpenGitHub} onOpenChange={setPopoverOpenGitHub}>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpenGitHub}
                            className="col-span-3 justify-between h-10 text-base"
                             onClick={!githubRepos.length ? fetchGitHubRepos : undefined}
                            disabled={loadingGitHub || isSaving}
                        >
                           {loadingGitHub ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {githubRepo ? selectedGitHubRepoName : "Select or Connect..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                         <Command>
                            <CommandInput placeholder="Search repo..." className="text-base" />
                            <CommandList>
                                <CommandEmpty>No repositories found.</CommandEmpty>
                                <CommandGroup>
                                {githubRepos.map((repo) => (
                                    <CommandItem
                                    key={repo.id}
                                    value={repo.full_name} // Use full_name for value
                                    onSelect={(currentValue) => {
                                        setGithubRepo(currentValue === githubRepo ? "" : currentValue)
                                        setPopoverOpenGitHub(false)
                                    }}
                                    className="text-sm"
                                    >
                                     <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        githubRepo === repo.full_name ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {repo.full_name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                 {connectError && <p className="text-sm text-red-500 col-span-4">Connection Error: {connectError}</p>} 
                 {error && <p className="text-sm text-red-500 col-span-4">Save Error: {error}</p>} 

                 {/* --- Changelog / Notes --- */} 
                 <div className="col-span-4 border-t pt-4 mt-4">
                     <h4 className="text-lg font-semibold mb-3">Activity & Notes</h4>
                     
                     {/* Add Note Section */}
                     <div className="mb-4 p-3 border rounded-md">
                        <Label htmlFor={`new-note-${project.id}`} className="text-sm font-medium">Add a new note</Label>
                        <Textarea 
                            id={`new-note-${project.id}`}
                            placeholder="Type your note..."
                            value={newNoteText}
                            onChange={(e) => setNewNoteText(e.target.value)}
                            rows={3}
                            className="mt-1 mb-2 text-base min-h-[80px]"
                            disabled={isAddingNote}
                        />
                        {noteError && <p className="text-xs text-red-500 mb-2">{noteError}</p>}
                        <Button 
                            type="button" 
                            size="sm" 
                            onClick={handleAddNote} 
                            disabled={isAddingNote || !newNoteText.trim()}
                        >
                           {isAddingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Note
                        </Button>
                     </div>

                     {/* Existing Changelog Display */}
                     <h5 className="text-sm font-medium text-muted-foreground mb-2">History (Latest 3)</h5>
                     {project.changelog && project.changelog.length > 0 ? (
                        <ul className="space-y-3">
                            {project.changelog.map((entry) => (
                            <li key={entry.id} className="flex items-start space-x-3">
                                <div className="mt-1"><ProviderIcon provider={entry.provider} /></div>
                                <div className="flex-1 space-y-0.5">
                                <p className="text-sm whitespace-pre-wrap break-words" title={formatChangelogMessage(entry)}>
                                    {formatChangelogMessage(entry)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDateTime(entry.createdAt)}
                                </p>
                                </div>
                            </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No recent activity found.</p>
                    )}
                 </div>

                {/* --- Launch Checklist Section --- */} 
                <div className="col-span-4 border-t pt-4 mt-4">
                    <h4 className="text-lg font-semibold mb-3">Launch Checklist</h4>
                    
                    {/* Progress Bar */}
                    {checklistData && checklistData.total_tasks > 0 && (
                        <div className="mt-2 mb-4">
                            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                                <div 
                                    className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${checklistProgress}%` }}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                {checklistData.completed_tasks} of {checklistData.total_tasks} tasks complete
                            </p>
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
                    
                    {/* Task List */}
                    <div className="border rounded-md p-3 mb-4">
                        {checklistLoading && (
                            <div className="flex items-center justify-center text-muted-foreground p-6">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading Tasks...
                            </div>
                        )}
                        {checklistError && <p className="text-red-500 text-center p-6">Error loading checklist: {checklistError.message}</p>}
                        {checklistData && checklistData.tasks.length > 0 ? (
                            <ul className="space-y-3">
                                {checklistData.tasks.map(task => (
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
                        ) : checklistData && checklistData.tasks.length === 0 ? (
                            <p className="text-center text-muted-foreground p-6">No checklist items found. Add some tasks to get started.</p>
                        ) : null}
                        {toggleError && <p className="text-xs text-red-500 mt-2 text-center">{toggleError}</p>}
                    </div>
                </div>
            </div>
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 border-t sm:justify-between flex-shrink-0">
            <AlertDialog>
                 <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" disabled={isSaving || isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Project
                    </Button>
                 </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the project
                        and all associated data (notes, snapshots, etc.).
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isDeleting ? 'Deleting...' : 'Yes, delete project'}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isSaving || isDeleting}>Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={() => handleSaveChanges()} disabled={isSaving || isDeleting}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 