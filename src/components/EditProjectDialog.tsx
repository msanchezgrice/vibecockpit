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
import { Loader2, Pencil, Trash2, MessageSquareText, GitCommitHorizontal, Check, ChevronsUpDown } from 'lucide-react';
import { Project, ProjectStatus, CostSnapshot, AnalyticsSnapshot, ChangeLogEntry } from '@/generated/prisma';
import { formatDateTime } from '@/lib/utils'; // Assuming formatDateTime is reusable
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { signIn, useSession } from 'next-auth/react'; // Import useSession and signIn

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

// Add types for fetched lists
interface VercelProjectOption {
  id: string;
  name: string;
}
interface GitHubRepoOption {
  id: number;
  full_name: string; // owner/repo
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const router = useRouter();
  const { status: sessionStatus } = useSession(); // Only get status
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
  const [vercelProjects, setVercelProjects] = useState<VercelProjectOption[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepoOption[]>([]);
  const [loadingVercel, setLoadingVercel] = useState(false);
  const [loadingGitHub, setLoadingGitHub] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [popoverOpenVercel, setPopoverOpenVercel] = useState(false);
  const [popoverOpenGitHub, setPopoverOpenGitHub] = useState(false);
  const [isVercelLinked, setIsVercelLinked] = useState(false); // Track Vercel link status
  const [checkingLinkStatus, setCheckingLinkStatus] = useState(true);

  // Action States
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  // Check linked status on mount/session change
  useEffect(() => {
      if (sessionStatus === 'authenticated') {
          // Check if a Vercel account exists for this user
          // NOTE: This requires an API endpoint or fetching accounts client-side (less secure)
          // For now, we'll simulate this check. Replace with actual check later.
          const simulateCheck = async () => {
              setCheckingLinkStatus(true);
              // TODO: Implement API route like /api/auth/linked-accounts
              // For now, assume NOT linked unless we find the project ID already set
              setIsVercelLinked(!!project.vercelProjectId);
              setCheckingLinkStatus(false);
          };
          simulateCheck();
      } else if (sessionStatus === 'unauthenticated') {
          setIsVercelLinked(false);
          setCheckingLinkStatus(false);
      }
  }, [sessionStatus, project.vercelProjectId]);

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

  // Fetch Vercel Projects
  const fetchVercelProjects = async () => {
    setLoadingVercel(true);
    setConnectError(null);
    try {
      const res = await fetch('/api/vercel/projects');
      if (!res.ok) throw new Error('Failed to fetch Vercel projects');
      const data = await res.json();
      setVercelProjects(data);
      setPopoverOpenVercel(true); // Open popover on successful fetch
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Vercel fetch error');
    } finally {
      setLoadingVercel(false);
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
  const selectedVercelProjectName = vercelProjects.find(p => p.id === vercelId)?.name ?? vercelId;
  const selectedGitHubRepoName = githubRepos.find(r => r.full_name === githubRepo)?.full_name ?? githubRepo;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon"> 
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl flex flex-col max-h-[90vh]">
        <DialogHeader className="pr-6">
          <DialogTitle>Edit Project: {projectName}</DialogTitle>
          <DialogDescription>View details, make changes, and add notes.</DialogDescription>
        </DialogHeader>

        {/* Hero Image Placeholder */}
        <div className="h-32 bg-muted rounded-md my-4 flex items-center justify-center text-muted-foreground">
            Hero Image Placeholder
        </div>

        <ScrollArea className="flex-grow pr-6">
            <div className="grid gap-4 py-4">
                {/* --- Edit Fields --- */} 
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-name-${project.id}`} className="text-right">Name</Label>
                    <Input id={`edit-name-${project.id}`} value={projectName} onChange={(e) => setProjectName(e.target.value)} className="col-span-3" required disabled={isSaving}/>
                </div>
                 <div className="grid grid-cols-4 items-start gap-4"> {/* Align start for textarea */}
                    <Label htmlFor={`edit-desc-${project.id}`} className="text-right pt-2">Description</Label>
                    <Textarea id={`edit-desc-${project.id}`} placeholder="(Optional)..." value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={3} disabled={isSaving}/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-status-${project.id}`} className="text-right">Status</Label>
                     <Select value={currentStatus} onValueChange={(v) => setCurrentStatus(v as ProjectStatus)} disabled={isSaving}>
                        <SelectTrigger className="col-span-3"><SelectValue/></SelectTrigger>
                        <SelectContent>
                            {Object.values(ProjectStatus).map((s) => (<SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-feUrl-${project.id}`} className="text-right">Frontend URL</Label>
                    <Input id={`edit-feUrl-${project.id}`} type="url" placeholder="https://... (Optional)" value={frontendUrl} onChange={(e) => setFrontendUrl(e.target.value)} className="col-span-3" disabled={isSaving}/>
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">Vercel Project</Label>
                    {isVercelLinked ? (
                        <Popover open={popoverOpenVercel} onOpenChange={setPopoverOpenVercel}>
                            <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                className="col-span-3 justify-between"
                                onClick={!vercelProjects.length ? fetchVercelProjects : undefined}
                                disabled={loadingVercel || isSaving}
                            >
                                {loadingVercel ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {vercelId ? selectedVercelProjectName : "Select Project..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                            <Command>
                                <CommandInput placeholder="Search project..." />
                                <CommandList>
                                    <CommandEmpty>No projects found.</CommandEmpty>
                                    <CommandGroup>
                                    {vercelProjects.map((vp) => (
                                        <CommandItem
                                        key={vp.id}
                                        value={vp.id} // Use ID for value
                                        onSelect={(currentValue) => {
                                            setVercelId(currentValue === vercelId ? "" : currentValue)
                                            setPopoverOpenVercel(false)
                                        }}
                                        >
                                        <Check
                                            className={cn(
                                            "mr-2 h-4 w-4",
                                            vercelId === vp.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {vp.name}
                                        </CommandItem>
                                    ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                            </PopoverContent>
                        </Popover>
                    ) : (
                         <Button 
                             type="button" 
                             className="col-span-3" 
                             onClick={() => signIn('vercel')} // Trigger Vercel OAuth flow
                             disabled={checkingLinkStatus || sessionStatus !== 'authenticated'}
                         >
                           {checkingLinkStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Connect Vercel Account
                         </Button>
                    )}
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right">GitHub Repo</Label>
                     <Popover open={popoverOpenGitHub} onOpenChange={setPopoverOpenGitHub}>
                        <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={popoverOpenGitHub}
                            className="col-span-3 justify-between"
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
                            <CommandInput placeholder="Search repo..." />
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
                            className="mt-1 mb-2"
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
            </div>
        </ScrollArea>

        <DialogFooter className="mt-auto pt-4 border-t sm:justify-between">
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