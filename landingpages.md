Goal
Replace every “coming soon / placeholder” on the marketing site with final copy and real, high-fidelity PNG screenshots (Option 1: assets live in the repo).
0. New image assets
Capture on a populated local project and save exactly to these paths:
| Purpose (alt text) | File name (1920×1080 PNG, ≤600 KB) | Mobile version (optional 900×1600) |
|--------------------------------------|---------------------------------------------------|------------------------------------|
| Dashboard overview | public/screenshots/dashboard-desktop.png | …/dashboard-mobile.png |
| Ask-AI chat drawer | public/screenshots/ai-chat.png | — |
| Task recommendations list | public/screenshots/task-recommendations.png | — |
| Launch checklist progress | public/screenshots/launch-checklist.png | — |
| Integrations settings (GitHub etc.) | public/screenshots/integrations.png | — |
> After adding the files, run pnpm lint && pnpm build to ensure import paths resolve.
1. HeroSection.tsx (homepage)
Import next/image.
Replace the gray placeholder block with
<Image
  src="/screenshots/dashboard-desktop.png"
  alt="VirtualCofounder.ai dashboard overview"
  fill
  className="object-cover"
/>
Remove the emoji caption.
2. ScreenshotsSection.tsx
Extend the screenshots array to include an img field:
const screenshots = [
  {
    id: 1,
    title: "AI Task Recommendations",
    description: "Personalized suggestions with context-aware priorities",
    img: "/screenshots/task-recommendations.png",
  },
  /* …repeat for the five images above… */
];
Inside the display block replace the inner <div className="relative …"> with:
<Image
  src={screenshots[activeIndex].img}
  alt={screenshots[activeIndex].title}
  fill
  className="object-contain"
/>
3. /app/(marketing)/features/page.tsx
Replace entire placeholder section with:
export default function FeaturesPage() {
  return (
    <section className="container mx-auto px-4 py-12 md:py-24 space-y-24">
      <header className="max-w-3xl mx-auto text-center space-y-4">
        <h1 className="text-5xl font-bold">AI-Powered Features</h1>
        <p className="text-xl text-gray-600">
          Everything you need to ideate, build, and launch—faster.
        </p>
      </header>

      {/* Feature grid */}
      <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "Proactive Task Recommendations",
            body:
              "Your AI co-founder scans commits, PRs, and deployments and suggests the \
              next most impactful tasks—complete with context and references.",
            icon: "Brain",
          },
          {
            title: "Unified Project Dashboard",
            body:
              "Costs, performance, and engineering velocity from GitHub & Vercel in a \
              single, real-time view.",
            icon: "LineChart",
            img: "/screenshots/dashboard-desktop.png",
          },
          {
            title: "Ask-AI Chat",
            body:
              "Chat with an agent that already knows your codebase. Answers are \
              foot-noted with live web research and file links.",
            icon: "MessageSquare",
            img: "/screenshots/ai-chat.png",
          },
          {
            title: "Launch Checklist",
            body:
              "An auto-generated, interactive checklist that tracks your path to \
              production with best-practice gates.",
            icon: "ListChecks",
            img: "/screenshots/launch-checklist.png",
          },
          {
            title: "Continuous Insights",
            body:
              "Receive alerts when your metrics deviate or a library introduces a \
              breaking change.",
            icon: "BellRing",
          },
          {
            title: "Plug-and-Play Integrations",
            body:
              "One-click GitHub and Vercel auth—no complex setup, no YAML files.",
            icon: "Plug",
            img: "/screenshots/integrations.png",
          },
        ].map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}
(Ensure a reusable <FeatureCard> component exists or inline one.)
4. /app/(marketing)/use-cases/page.tsx
Replace placeholder with four persona sections:
const personas = [
  {
    name: "Solo Makers",
    pain: "Wearing every hat slows you down.",
    gain:
      "VC.ai prioritizes your backlog so you ship weekly instead of monthly.",
    img: "/screenshots/task-recommendations.png",
  },
  {
    name: "Early-Stage Teams",
    pain: "Keeping everyone aligned is hard.",
    gain:
      "Shared AI-curated checklist keeps designers & engineers on the same path.",
    img: "/screenshots/dashboard-desktop.png",
  },
  /* Agencies, PMs … */
];
Loop and render split-left text, split-right <Image> alternating sides.
5. /app/(marketing)/pricing/page.tsx
Replace placeholder with a pricing switcher:
const plans = [
  {
    name: "Free",
    price: 0,
    desc: "Ideal for hobby projects",
    bullets: ["1 project", "50 AI credits / mo", "Community support"],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: 19,
    desc: "For indie devs & small startups",
    bullets: ["Unlimited projects", "2,000 AI credits / mo",
              "Priority queue", "Email support"],
    cta: "Start 14-Day Trial",
  },
  {
    name: "Startup",
    price: 49,
    desc: "Growing teams up to 5 members",
    bullets: ["Team dashboard", "10,000 AI credits / mo",
              "Slack alerts", "Priority email + chat"],
    cta: "Upgrade Now",
  },
  {
    name: "Enterprise",
    price: "Contact",
    desc: "Custom needs? We’ve got you.",
    bullets: ["SSO", "Custom seats", "Dedicated success manager"],
    cta: "Contact Sales",
  },
];
Render with Tailwind card grid; include monthly/annual toggle that multiplies the numeric price by 0.8 when annual is active.
6. Navigation tweaks
Ensure Header.tsx and Footer.tsx links remain unchanged; they now lead to populated pages.
7. Checklist to finish
Add PNGs to /public/screenshots/ with the exact filenames above.
Implement code changes (sections 1-5).
pnpm lint && pnpm build — should pass.
Commit:
git add public/screenshots src/components/marketing src/app/(marketing)/*
git commit -m "feat(marketing): fill features, use-cases, pricing pages + real screenshots"
Push → Vercel will auto-deploy.