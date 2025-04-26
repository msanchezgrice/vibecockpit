import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import Link from 'next/link';
import { LoginButton, LogoutButton } from './authButtons';
import ProjectCard from '@/components/ProjectCard';
import { Project } from '@/generated/prisma'; // Keep this simple for now
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

// Revert to original function fetching from API
async function getProjects(cookie: string | null): Promise<Project[]> {
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
    return response.json();
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

  const requestHeaders = headers();
  const cookie = requestHeaders.get('cookie');
  const projects = await getProjects(cookie); // Call original fetcher

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

      {/* Project List */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))
        ) : (
          <p className="col-span-full text-center text-muted-foreground">
            No projects found.
          </p>
        )}
      </div>

      {/* Add Project Button (Placeholder) */}
      {/* We will add functionality later */}
      <div className="mt-8">
        <button className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
          Add New Project
        </button>
      </div>

       <Link href="/" className="mt-12 text-blue-500 hover:underline">
        Go back home
      </Link>

    </main>
  );
} 