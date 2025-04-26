import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]'; // Adjust path if needed
import Link from 'next/link';
import { LoginButton, LogoutButton } from './authButtons'; // Client components for buttons

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <div className="mb-8 p-4 border rounded bg-gray-100 dark:bg-gray-800">
        <h2 className="text-lg font-semibold mb-2">Session Info (Server Side)</h2>
        {session ? (
          <pre className="text-sm">{JSON.stringify(session, null, 2)}</pre>
        ) : (
          <p>Not signed in.</p>
        )}
      </div>
      <div>
        {session ? (
          <>
            <p className="mb-2">Signed in as {session.user?.email}</p>
            <LogoutButton />
          </>
        ) : (
          <>
            <p className="mb-2">You are not signed in.</p>
            <LoginButton />
          </>
        )}
      </div>
      <Link href="/" className="mt-8 text-blue-500 hover:underline">
        Go back home
      </Link>
    </main>
  );
} 