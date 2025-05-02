import { FeatureCard } from "@/components/ui/FeatureCard";

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