'use client';

import { Project, ProjectStatus, ChangeLogEntry, CostSnapshot, AnalyticsSnapshot } from '@/generated/prisma';
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
import { MessageSquareText, GitCommitHorizontal, Github, ExternalLink, Clock } from 'lucide-react';
import { EditProjectDialog } from './EditProjectDialog';
import { formatDateTime, formatDistanceToNow } from '@/lib/utils';
import { ChecklistPreview } from './ChecklistPreview';
import { CodingPlatform } from '@/lib/types';

interface ProjectCardProps {
  project: Project & { 
    changelog: ChangeLogEntry[];
    costSnapshots: CostSnapshot[];
    analyticsSnapshots: AnalyticsSnapshot[]; 
  };
}

// Helper to render provider icon
function ProviderIcon({ provider }: { provider: string }) {
    if (provider === 'note') return <MessageSquareText className="h-4 w-4 text-muted-foreground" />;
    if (provider === 'github_commit') return <GitCommitHorizontal className="h-4 w-4 text-muted-foreground" />;
    return null;
}

// Helper to get platform name
function getPlatformName(platform: CodingPlatform | undefined): string {
  if (!platform) return 'Unknown';
  
  // Convert SNAKE_CASE to Title Case
  return platform.toString()
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const [currentStatus, setCurrentStatus] = useState(project.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Find latest commit
  const latestCommit = project.changelog.find(entry => entry.provider === 'github_commit');
  const lastCommitTime = latestCommit?.createdAt;

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

  return (
    <Card className="w-full flex flex-col justify-between h-full">
      <div>
        <CardHeader>
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
        <CardContent className="grid gap-4">
          {/* Thumbnail Image */}
          <div className="rounded-xl overflow-hidden border">
            <Image 
              src={project.thumbUrl || '/images/thumb-placeholder.png'} 
              alt={project.name} 
              width={500} 
              height={280} 
              className="w-full h-auto object-cover"
            />
            {lastCommitTime && (
              <div className="p-2 bg-white border-t flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                Last commit: {formatDistanceToNow(lastCommitTime)} ago
              </div>
            )}
          </div>
          
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
                      {status.charAt(0).toUpperCase() + status.slice(1)} {/* Capitalize */}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
          </div>
          
          {/* Platform */}
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium leading-none">Platform</p>
              <p className="text-sm">{getPlatformName(project.platform as CodingPlatform)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 rounded-md border p-4">
            <div className="flex-1 space-y-1 overflow-hidden">
              <p className="text-sm font-medium leading-none">Frontend URL</p>
              {project.frontendUrl ? (
                <Link
                  href={project.frontendUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline block truncate"
                >
                  {project.frontendUrl}
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
              {project.githubRepo && (
                <Link
                  href={`https://github.com/${project.githubRepo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline block truncate"
                >
                  {project.githubRepo}
                </Link>
              )}
            </div>
          </div>

          {/* Conditionally render Checklist Preview */}
          {project.status === 'prep_launch' && (
            <ChecklistPreview projectId={project.id} />
          )}

          {/* Add Changelog Display */}
          {project.changelog && project.changelog.length > 0 && (
            <div className="space-y-2 border-t pt-4 mt-4">
              <h4 className="text-sm font-medium leading-none mb-2">Recent Activity</h4>
              <ul className="space-y-3">
                {project.changelog.map((entry) => (
                  <li key={entry.id} className="flex items-start space-x-3">
                    <div className="mt-1">
                        <ProviderIcon provider={entry.provider} />
                    </div>
                    <div className="flex-1 space-y-0.5 overflow-hidden">
                      <p className="text-sm text-muted-foreground line-clamp-2" title={formatChangelogMessage(entry)}>
                        {formatChangelogMessage(entry)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </div>
      <CardFooter className="flex justify-between items-center border-t mt-auto pt-4">
        <p className="text-xs text-muted-foreground">
          Last Activity: {formatDateTime(project.lastActivityAt)}
        </p>
        <NotesDrawer projectId={project.id} />
      </CardFooter>
    </Card>
  );
} 