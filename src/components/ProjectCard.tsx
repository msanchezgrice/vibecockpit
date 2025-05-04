'use client';

import { Project, ProjectStatus, CostSnapshot, AnalyticsSnapshot, ChangeLogEntry, CodingPlatform } from '@/generated/prisma';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import NotesDrawer from './NotesDrawer';
import { MessageSquareText, GitCommitHorizontal, Github, ExternalLink, Link2, Code } from 'lucide-react';
import { EditProjectDialog } from './EditProjectDialog';
import { formatDateTime } from '@/lib/utils';
import { ChecklistPreview } from './ChecklistPreview';

interface ProjectCardProps {
  project: Project & { 
    latestCostSnapshot?: CostSnapshot | null;
    latestAnalyticsSnapshot?: AnalyticsSnapshot | null; 
    costSnapshots: CostSnapshot[]; 
    analyticsSnapshots: AnalyticsSnapshot[]; 
    changelog: ChangeLogEntry[];
  };
}

// Helper to render provider icon
function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'note') return <MessageSquareText className="h-4 w-4 text-muted-foreground" />;
  if (provider === 'github_commit') return <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />;
  return null;
}

// Platform title mapper
function getPlatformTitle(platform: CodingPlatform): string {
  const titles: Record<CodingPlatform, string> = {
    CURSOR: 'Cursor',
    WINDSURF: 'Windsurf',
    REPLIT: 'Replit',
    MANUS: 'Manus',
    OPENAI_CANVAS: 'OpenAI Canvas',
    ANTHROPIC_CONSOLE: 'Anthropic Console',
    OTHER: 'Other Platform'
  };
  return titles[platform] || 'Unknown Platform';
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [currentStatus, setCurrentStatus] = useState(project.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (newStatus === currentStatus || isUpdating) {
      return;
    }
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      const updatedProject: Project = await response.json();
      setCurrentStatus(updatedProject.status);
    } catch (err: unknown) {
      console.error('Status update failed:', err);
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(message);
      setCurrentStatus(project.status);
    } finally {
      setIsUpdating(false);
    }
  };

  // Format changelog message (simple example: take first line)
  const formatChangelogMessage = (entry: ChangeLogEntry) => {
    if (entry.provider === 'github_commit') {
      return entry.message.split('\n')[1] || entry.message; // Show message after SHA
    }
    return entry.message;
  };

  // Helper function to get a proper display label for project status
  const getStatusLabel = (status: string): string => {
    const statusLabels: Record<string, string> = {
      'design': 'Design',
      'prep_launch': 'Preparing to Launch',
      'launched': 'Launched',
      'paused': 'Paused',
      'retired': 'Retired'
    };
    return statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Card className="w-full flex flex-col justify-between h-full">
      <div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-2 overflow-hidden">
              <CardTitle className="truncate text-lg">{project.name}</CardTitle>
              {project.description && (
                <CardDescription className="pt-1 break-words line-clamp-2 text-sm">{project.description}</CardDescription>
              )}
              <CardDescription className="text-xs">Created: {formatDateTime(project.createdAt)}</CardDescription>
            </div>
            <EditProjectDialog project={project} />
          </div>
        </CardHeader>
        
        {/* Thumbnail Preview */}
        {project.thumbUrl && (
          <div className="px-6 pb-4">
            <div className="relative w-full h-40 rounded-md overflow-hidden border border-border">
              <Image 
                src={project.thumbUrl} 
                alt={`Screenshot of ${project.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              {project.url && (
                <Link 
                  href={project.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-foreground px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-background/95 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Visit Site
                </Link>
              )}
            </div>
          </div>
        )}
        
        <CardContent className="grid gap-4">
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Status</p>
              <Select
                value={currentStatus}
                onValueChange={handleStatusChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ProjectStatus).map((status) => (
                    <SelectItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          </div>
          
          {/* Platform Info */}
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Code className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 space-y-1 overflow-hidden">
              <p className="text-sm font-medium leading-none">Development Platform</p>
              <p className="text-sm">
                {getPlatformTitle(project.platform)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Link2 className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 space-y-1 overflow-hidden">
              <p className="text-sm font-medium leading-none">Website URL</p>
              {project.url ? (
                <Link
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline block truncate"
                >
                  {project.url}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground italic">Not set</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <Github className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 space-y-1 overflow-hidden">
              <p className="text-sm font-medium leading-none">GitHub Repo</p>
              {project.repoUrl && (
                <Link
                  href={`https://github.com/${project.repoUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline block truncate"
                >
                  {project.repoUrl}
                </Link>
              )}
            </div>
          </div>
          
          {/* Checklist Preview */}
          <div className="rounded-md border p-4">
            <ChecklistPreview projectId={project.id} />
          </div>
          
          {/* Recent Changes */}
          <div className="rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none mb-3">Recent Activity</p>
              <div className="space-y-2">
                {project.changelog.slice(0, 3).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <ProviderIcon provider={entry.provider} />
                    </div>
                    <div>
                      <p className="text-sm line-clamp-1">{formatChangelogMessage(entry)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                {project.changelog.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">No recent activity</p>
                )}
              </div>
            </div>
          </div>
          
        </CardContent>
      </div>
      <CardFooter className="justify-between p-4 pt-0">
        <NotesDrawer projectId={project.id} />
      </CardFooter>
    </Card>
  );
} 