import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Link from 'next/link';
import { LoginButton, LogoutButton } from '@/components/authButtons';
import ProjectCard from '@/components/ProjectCard';
import { Project, CostSnapshot, AnalyticsSnapshot, ChangeLogEntry } from '@/generated/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import { AddProjectDialog } from '@/components/AddProjectDialog';

// Define ProjectWithData including relations fetched
export type ProjectWithRelations = Project & {
  costSnapshots: CostSnapshot[]; // Will contain 0 or 1 entry
  analyticsSnapshots: AnalyticsSnapshot[]; // Will contain 0 or 1 entry
  changelog: ChangeLogEntry[]; // Will contain 0 to 3 entries
};

// Update fetch function return type
async function getProjects(cookie: string | null): Promise<ProjectWithRelations[]> {
  if (!cookie) return [];
  const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/projects`;
  try {
    const response = await fetch(url, {
      headers: { Cookie: cookie }, cache: 'no-store',
    });
    if (!response.ok) {
      if (response.status === 401) {
        console.error('Unauthorized fetching projects'); return [];
      }
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    return response.json(); // API now returns ProjectWithRelations structure
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/');
  }

  // Fetch projects immediately
  const requestHeaders = await headers();
  const cookie = requestHeaders.get('cookie');
  const projectsPromise = getProjects(cookie);

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-12 lg:p-24">
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Project Dashboard</h1>
        <div>
          {session ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{session.user?.email}</span>
              <LogoutButton />
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>

      {/* Project List with Suspense for loading */}
      <React.Suspense fallback={<LoadingProjects />}>
         {/* Resolve the promise inside the component that needs it */}
        <ProjectList projectsPromise={projectsPromise} />
      </React.Suspense>

      {/* Add Project Button */}
      <div className="mt-8">
        <AddProjectDialog />
      </div>

       <Link href="/" className="mt-12 text-blue-500 hover:underline">
        Go back home
      </Link>

    </main>
  );
}

// Loading component
function LoadingProjects() {
  return <p className="text-center text-muted-foreground">Loading projects...</p>;
}

// Component to render the list after data is fetched
async function ProjectList({ projectsPromise }: { projectsPromise: Promise<ProjectWithRelations[]> }) {
  const projects = await projectsPromise;
  return (
    <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.length > 0 ? (
        projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))
      ) : (
        <p className="col-span-full text-center text-muted-foreground">
          No projects found. Click &quot;Add New Project&quot; to get started.
        </p>
      )}
    </div>
  );
} 