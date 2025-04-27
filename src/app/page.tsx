import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { LoginButton } from './dashboard/authButtons';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-indigo-100 via-white to-cyan-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mt-6 mb-4 text-gray-800">
          Welcome to Vibe Cockpit
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          Please sign in with your GitHub account to continue.
        </p>
        <LoginButton />
      </div>
    </main>
  );
}
