'use client';

import { Project, ProjectStatus } from '@/generated/prisma';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use navigation router for App Router

interface ProjectCardProps {
  project: Project;
}

// Helper to format date/time
function formatDateTime(date: Date | string | null): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const router = useRouter();
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
      // Optionally: Refresh server-side props if needed, though local state update is often enough
      // router.refresh();
    } catch (err: any) {
      console.error('Status update failed:', err);
      setError(err.message);
      // Revert local state on error
      // Note: This simple revert might not be ideal in complex scenarios
      setCurrentStatus(project.status);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
        <CardDescription>Created: {formatDateTime(project.createdAt)}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center space-x-4 rounded-md border p-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">Status</p>
            <Select
              value={currentStatus}
              onValueChange={handleStatusChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[180px]">
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
        <div className="flex items-center space-x-4 rounded-md border p-4">
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">Frontend URL</p>
            {project.frontendUrl ? (
              <Link
                href={project.frontendUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-500 hover:underline break-all"
              >
                {project.frontendUrl}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not set</p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">
          Last Activity: {formatDateTime(project.lastActivityAt)}
        </p>
      </CardFooter>
    </Card>
  );
} 