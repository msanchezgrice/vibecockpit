import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Link from 'next/link';
import { LoginButton, LogoutButton } from '@/components/authButtons';
import ProjectCard from '@/components/ProjectCard';
import { Project, CostSnapshot, AnalyticsSnapshot, ChangeLogEntry } from '@/generated/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import React from 'react';
import { OnboardingClient } from './OnboardingClient';
import { VercelConnectPrompt } from '@/components/VercelConnectPrompt';

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
      <VercelConnectPrompt />
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
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

      <OnboardingClient />

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
    <>
      {projects.length > 0 ? (
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-8">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center my-12">
          <p className="text-lg text-muted-foreground mb-4">
            No projects found. Let&apos;s create your first project!
          </p>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Start by clicking the &quot;Create Project&quot; button to add your first project to the dashboard.
          </p>
        </div>
      )}
    </>
  );
} 