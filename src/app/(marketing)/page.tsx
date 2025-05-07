import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export default async function MarketingHomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-indigo-50 via-sky-50 to-teal-50 font-sans text-gray-900">

      {/* ---------------- HERO ---------------- */}
      <section className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 pb-32 pt-24 lg:flex-row lg:items-center lg:gap-16 lg:pt-40">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            ✨ Your Messy Side-Projects,<br className="hidden sm:block" />
            Organized & Shipped
                  </h1>
          <p className="mt-4 max-w-md text-lg text-gray-600">
            <strong>Virtualcofounder.ai</strong> keeps every {'"'}vibe-code{'"'} experiment in one place—repos,
            deployments, databases, costs—then pairs you with a{' '}
            <strong>Virtual Cofounder</strong> that pushes the last 20%.
          </p>
          <Button
            asChild
            className="mt-6 bg-blue-600 px-6 py-3 text-base hover:bg-blue-700"
          >
            <Link href="/api/auth/signin?callbackUrl=/dashboard">Sign in with GitHub</Link>
          </Button>
                </div>

        {/* Hero illustration (swap the src with your asset) */}
        <div className="hidden flex-1 lg:block">
          <Image
            src="/hero-illustration.png"
            alt="Developer dashboard illustration"
            className="w-full"
            width={600}
            height={400}
          />
                </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-10 text-center text-3xl font-bold">
          Why Builders Love Virtualcofounder.ai
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-xl font-semibold">
              🔗 All Your Links, Zero Guesswork
            </h3>
            <ul className="list-disc pl-5 text-gray-600">
              <li>GitHub repos, Vercel URLs, Supabase IDs—auto-linked</li>
              <li>Last commit, uptime & spend at a glance</li>
              <li>Notes so you never say {'"'}where did I leave off?{'"'}</li>
            </ul>
              </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-xl font-semibold">
              🤖 Virtual Cofounder
            </h3>
            <ul className="list-disc pl-5 text-gray-600">
              <li>Generates a tailored launch checklist</li>
              <li>Drafts copy, OG images & tweet threads</li>
              <li>Nudges you on Slack if tasks go stale</li>
            </ul>
            </div>
          </div>
        </section>

      {/* ---------------- AUDIENCE ---------------- */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="mb-6 text-3xl font-bold">Who{"'"}s It For?</h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Perfect for <strong>new-to-code makers</strong> and weekend hackers who
            can wrangle GitHub & Vercel but struggle to stay organised once idea #5 hits.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border bg-gray-50 p-6 shadow-sm">
              <h4 className="mb-2 text-lg font-semibold">🚀 Indie Devs</h4>
              <p className="text-sm text-gray-600">
                Keep experiments tidy and launch more often.
                </p>
              </div>

            <div className="rounded-xl border bg-gray-50 p-6 shadow-sm">
              <h4 className="mb-2 text-lg font-semibold">🛠️ Hack-Week Teams</h4>
              <p className="text-sm text-gray-600">
                Track multiple proofs-of-concept and avoid resource sprawl.
              </p>
            </div>

            <div className="rounded-xl border bg-gray-50 p-6 shadow-sm">
              <h4 className="mb-2 text-lg font-semibold">🎓 Students & Boot-campers</h4>
              <p className="text-sm text-gray-600">
                Focus on learning; let Virtualcofounder.ai handle the housekeeping.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- AI CAPABILITIES ---------------- */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-10 text-center text-3xl font-bold">
          What Your Virtual Cofounder Does
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold">📝 Launch Checklist Example</h3>
            <ol className="space-y-1 text-sm text-gray-600">
              <li>1. Write 60-char tagline</li>
              <li>
                2. Stand-up{' '}
                <code className="rounded bg-gray-100 px-1">/landing</code>
              </li>
              <li>3. Draft Product Hunt copy</li>
              <li>4. Create OG image</li>
              <li>5. Schedule tweet thread</li>
            </ol>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-lg font-semibold">⚡ Automations</h3>
            <ul className="list-disc pl-5 text-sm text-gray-600">
              <li>Nightly cost & uptime scan → Slack ping</li>
              <li>Detects commit drought → suggests next task</li>
              <li>Generates images via DALL·E 3 on demand</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
            How it Works
          </span>
          <h2 className="mb-10 mt-4 text-3xl font-bold">
            Three Steps from Chaos → Clarity
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { num: "1️⃣", title: "Connect", copy: "Sign in with GitHub & permit Vercel access." },
              { num: "2️⃣", title: "Organise", copy: "Virtualcofounder.ai auto-links repos, URLs, DBs & spend." },
              { num: "3️⃣", title: "Finish", copy: "Virtual Cofounder generates tasks & pushes them to done." },
            ].map((step) => (
              <div key={step.num} className="rounded-xl border bg-white p-6 shadow-sm">
                <h4 className="mb-2 text-lg font-semibold">
                  {step.num} {step.title}
                </h4>
                <p className="text-sm text-gray-600">{step.copy}</p>
              </div>
            ))}
            </div>
          </div>
        </section>

      {/* ---------------- CTA ---------------- */}
      <section className="bg-blue-600 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">
          🛫 Ready to finish every project you start?
        </h2>
        <Button
          asChild
          className="mt-6 bg-white text-blue-600 hover:bg-gray-100"
        >
          <Link href="/api/auth/signin?callbackUrl=/dashboard">Sign in with GitHub</Link>
        </Button>
      </section>
    </div>
  );
}
