import { PersonaSection } from "@/components/marketing/PersonaSection";

export default function UseCasesPage() {
  const personas = [
    {
      name: "Solo Makers",
      pain: "Wearing every hat slows you down. You're constantly context-switching between coding, designing, marketing, and planning—making it hard to maintain momentum.",
      gain: "VirtualCofounder.ai prioritizes your backlog so you ship weekly instead of monthly. It handles the project management overhead so you can focus on building.",
      img: "/screenshots/task-recommendations.png",
    },
    {
      name: "Early-Stage Teams",
      pain: "Keeping everyone aligned is hard. Different priorities and communication gaps lead to feature creep and missed deadlines.",
      gain: "Shared AI-curated checklist keeps designers & engineers on the same path. Real-time dashboards create transparency across the team.",
      img: "/screenshots/dashboard-desktop.png",
    },
    {
      name: "Agencies & Consultants",
      pain: "Managing multiple client projects simultaneously creates complexity. Knowledge transfer between teammates is inconsistent.",
      gain: "VirtualCofounder.ai provides instant context on any project, ensuring best practices are followed even when team members switch contexts.",
      img: "/screenshots/launch-checklist.png",
    },
    {
      name: "Product Managers",
      pain: "Prioritizing work without technical depth is challenging. Making informed decisions requires constant developer input.",
      gain: "Ask-AI about technical implications, implementation details, and timelines—get answers backed by real data from your codebase and web sources.",
      img: "/screenshots/ai-chat.png",
    },
  ];

  return (
    <section className="container mx-auto px-4 py-12 md:py-24">
      <header className="max-w-3xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Use Cases</h1>
        <p className="text-xl text-gray-600">
          See how different teams leverage VirtualCofounder.ai to accelerate their projects
        </p>
      </header>
      
      <div className="space-y-4">
        {personas.map((persona, index) => (
          <PersonaSection 
            key={persona.name} 
            {...persona} 
            reversed={index % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
} 