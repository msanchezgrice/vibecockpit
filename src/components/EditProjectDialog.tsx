'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Loader2, Pencil } from 'lucide-react';
import { Project, ProjectStatus, CostSnapshot, AnalyticsSnapshot, ChangeLogEntry } from '@/generated/prisma';

// Define the expected prop type, including relations
// Although we only edit Project fields, passing the full type helps
type ProjectWithRelations = Project & { 
    costSnapshots: CostSnapshot[]; 
    analyticsSnapshots: AnalyticsSnapshot[]; 
    changelog: ChangeLogEntry[];
};

interface EditProjectDialogProps {
  project: ProjectWithRelations;
}

export function EditProjectDialog({ project }: EditProjectDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // Initialize state with project data
  const [projectName, setProjectName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [currentStatus, setCurrentStatus] = useState(project.status);
  const [frontendUrl, setFrontendUrl] = useState(project.frontendUrl ?? '');
  const [vercelId, setVercelId] = useState(project.vercelProjectId ?? '');
  const [githubRepo, setGithubRepo] = useState(project.githubRepo ?? '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Effect to reset form if project prop changes (though unlikely here)
  useEffect(() => {
    setProjectName(project.name);
    setDescription(project.description ?? '');
    setCurrentStatus(project.status);
    setFrontendUrl(project.frontendUrl ?? '');
    setVercelId(project.vercelProjectId ?? '');
    setGithubRepo(project.githubRepo ?? '');
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Client-side validation (mirroring Add dialog)
    if (!projectName.trim()) {
      setError('Project name is required.');
      setIsLoading(false);
      return;
    }
     if (frontendUrl && !/^https?:\/\//.test(frontendUrl)) {
      setError('Please enter a valid Frontend URL.');
      setIsLoading(false);
      return;
    }
    if (githubRepo && !/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/.test(githubRepo)) {
      setError('GitHub Repo must be in format owner/repo.');
      setIsLoading(false);
      return;
    }

    // Construct payload with only changed fields (optional optimization)
    // For simplicity, we send all fields for now.
    const payload = {
        name: projectName,
        description: description || undefined,
        status: currentStatus,
        frontendUrl: frontendUrl || undefined,
        vercelProjectId: vercelId || undefined,
        githubRepo: githubRepo || undefined,
    };

    try {
      const response = await fetch(`/api/projects/${project.id}`, { // Use PATCH and project ID
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update project');
      }

      // Success
      setIsOpen(false); // Close dialog
      router.refresh(); // Refresh server components (dashboard list)

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to update project:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
         {/* Edit Icon Button */}
        <Button variant="ghost" size="icon"> 
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project: {project.name}</DialogTitle>
          <DialogDescription>
            Update the details for this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                {/* Name Input */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-name-${project.id}`} className="text-right">Name</Label>
                    <Input id={`edit-name-${project.id}`} value={projectName} onChange={(e) => setProjectName(e.target.value)} className="col-span-3" required disabled={isLoading}/>
                </div>
                {/* Description Textarea */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-desc-${project.id}`} className="text-right">Description</Label>
                    <Textarea id={`edit-desc-${project.id}`} placeholder="(Optional) A brief description..." value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" rows={3} disabled={isLoading}/>
                </div>
                {/* Status Select */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-status-${project.id}`} className="text-right">Status</Label>
                     <Select value={currentStatus} onValueChange={(v) => setCurrentStatus(v as ProjectStatus)} disabled={isLoading}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.values(ProjectStatus).map((status) => (
                            <SelectItem key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {/* Frontend URL Input */}
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-feUrl-${project.id}`} className="text-right">Frontend URL</Label>
                    <Input id={`edit-feUrl-${project.id}`} type="url" placeholder="https://... (Optional)" value={frontendUrl} onChange={(e) => setFrontendUrl(e.target.value)} className="col-span-3" disabled={isLoading}/>
                </div>
                {/* Vercel ID Input */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-vercelId-${project.id}`} className="text-right">Vercel ID</Label>
                    <Input id={`edit-vercelId-${project.id}`} placeholder="(Optional)" className="col-span-3" value={vercelId} onChange={(e) => setVercelId(e.target.value)} disabled={isLoading}/> 
                </div>
                {/* GitHub Repo Input */}
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor={`edit-ghRepo-${project.id}`} className="text-right">GitHub Repo</Label>
                    <Input id={`edit-ghRepo-${project.id}`} placeholder="owner/repo (Optional)" className="col-span-3" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} disabled={isLoading}/>
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mb-4 px-1">Error: {error}</p>}
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isLoading}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 