'use client';

import { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";

export function AddProjectDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [frontendUrl, setFrontendUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!projectName.trim()) {
      setError('Project name is required.');
      setIsLoading(false);
      return;
    }

    if (frontendUrl && !/^https?:\/\//.test(frontendUrl)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            name: projectName,
            description: description || undefined,
            frontendUrl: frontendUrl || undefined,
         }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create project');
      }

      setIsOpen(false);
      setProjectName('');
      setDescription('');
      setFrontendUrl('');
      router.refresh();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      console.error('Failed to create project:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add New Project</Button> 
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Project</DialogTitle>
          <DialogDescription>
            Enter the details for your new project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Name
                    </Label>
                    <Input 
                        id="name" 
                        value={projectName} 
                        onChange={(e) => setProjectName(e.target.value)}
                        className="col-span-3" 
                        required
                        disabled={isLoading}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                    Description
                    </Label>
                    <Textarea
                        id="description"
                        placeholder="(Optional) A brief description of the project."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="col-span-3" 
                        rows={3}
                        disabled={isLoading}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="frontendUrl" className="text-right">
                    Frontend URL
                    </Label>
                    <Input 
                        id="frontendUrl"
                        type="url"
                        placeholder="https://example.com (Optional)"
                        value={frontendUrl}
                        onChange={(e) => setFrontendUrl(e.target.value)}
                        className="col-span-3" 
                        disabled={isLoading}
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="vercelProjectId" className="text-right">
                     Vercel ID
                    </Label>
                    <Input id="vercelProjectId" placeholder="(Optional)" className="col-span-3" disabled={isLoading}/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="githubRepo" className="text-right">
                    GitHub Repo
                    </Label>
                    <Input id="githubRepo" placeholder="owner/repo (Optional)" className="col-span-3" disabled={isLoading}/>
                </div>
            </div>
            {error && <p className="text-sm text-red-500 mb-4 px-1">Error: {error}</p>}
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isLoading}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 