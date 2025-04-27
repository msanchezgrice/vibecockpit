import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { LoginButton } from '@/components/authButtons';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default async function MarketingHomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 border-b">
         <h1 className="text-xl font-semibold">Vibe Cockpit</h1>
      </header>

      <main className="flex-grow">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-indigo-100 via-white to-cyan-100">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-gray-900">
                    Monitor Your Vercel & GitHub Projects
                  </h1>
                  <p className="max-w-[600px] text-gray-600 md:text-xl">
                    Vibe Cockpit gives you a unified dashboard to track costs, activity, and analytics across your projects.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <LoginButton />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                 <div className="inline-block rounded-lg bg-gray-100 px-3 py-1 text-sm">How it Works</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simple Steps to Clarity</h2>
                <p className="max-w-[900px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Connect your accounts and let Vibe Cockpit gather the insights.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                     <CheckCircle className="w-5 h-5 text-green-500" /> Step 1: Connect
                  </CardTitle>
                  <CardDescription>Sign in securely with your GitHub account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Authorize Vibe Cockpit to access necessary data from GitHub, Vercel, and Supabase.</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                     <CheckCircle className="w-5 h-5 text-green-500" /> Step 2: Link Projects
                  </CardTitle>
                  <CardDescription>Add your projects and link their Vercel and GitHub details.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Provide Vercel Project IDs and GitHub repository names (owner/repo) via the dashboard.</p>
                </CardContent>
              </Card>
               <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                     <CheckCircle className="w-5 h-5 text-green-500" /> Step 3: Monitor
                  </CardTitle>
                  <CardDescription>View costs, activity, and analytics aggregated on your dashboard.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Nightly jobs collect data, keeping your dashboard up-to-date automatically.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

       <footer className="flex items-center justify-center w-full h-16 border-t">
        <p className="text-xs text-gray-500">© Vibe Cockpit</p>
      </footer>
    </div>
  );
}
