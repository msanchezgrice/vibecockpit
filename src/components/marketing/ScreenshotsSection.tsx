'use client';

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";

// Screenshots data with images
const screenshots = [
  {
    id: 1,
    title: "AI Task Recommendations",
    description: "Personalized suggestions with context-aware priorities",
    img: "/screenshots/task-recommendations.png"
  },
  {
    id: 2,
    title: "Project Dashboard",
    description: "A unified view of your GitHub and Vercel metrics",
    img: "/screenshots/dashboard-desktop.png"
  },
  {
    id: 3,
    title: "Launch Checklist",
    description: "Step-by-step guidance with AI-researched best practices",
    img: "/screenshots/launch-checklist.png"
  },
  {
    id: 4,
    title: "Ask AI Feature",
    description: "Get instant answers with web-sourced research for your specific tasks",
    img: "/screenshots/ai-chat.png"
  },
  {
    id: 5,
    title: "Progress Tracking",
    description: "Visualize your project's journey toward launch",
    img: "/screenshots/integrations.png"
  }
];

export function ScreenshotsSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const maxIndex = screenshots.length - 1;
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToIndex = (index: number) => {
    if (scrollRef.current) {
      const newIndex = Math.max(0, Math.min(index, maxIndex));
      setActiveIndex(newIndex);
    }
  };

  const handleNext = () => scrollToIndex(activeIndex + 1);
  const handlePrev = () => scrollToIndex(activeIndex - 1);

  return (
    <section className="w-full py-12 md:py-24 bg-white">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2 max-w-[800px]">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">See VirtualCofounder.ai at Work</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Explore how our AI cofounder streamlines your project development
            </p>
          </div>
        </div>

        <div className="relative">
          {/* Screenshot navigation buttons */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 z-10 hidden md:block">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full bg-white/80 shadow-md hover:bg-white"
              onClick={handlePrev}
              disabled={activeIndex === 0}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>
          
          <div className="absolute top-1/2 right-0 -translate-y-1/2 z-10 hidden md:block">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 rounded-full bg-white/80 shadow-md hover:bg-white"
              onClick={handleNext}
              disabled={activeIndex === maxIndex}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Screenshot display */}
          <div className="overflow-hidden rounded-xl border shadow-lg">
            <div 
              ref={scrollRef}
              className="h-[500px] bg-gray-100 flex items-center justify-center"
            >
              <div className="text-center p-6 w-full">
                <h3 className="text-xl font-bold mb-2">{screenshots[activeIndex].title}</h3>
                <p className="text-gray-500 mb-8">{screenshots[activeIndex].description}</p>
                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-3xl aspect-video bg-gray-200 rounded-md overflow-hidden">
                    <Image
                      src={screenshots[activeIndex].img}
                      alt={screenshots[activeIndex].title}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Screenshot indicators (dots) */}
            <div className="flex justify-center gap-2 py-4 bg-white">
              {screenshots.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  className={`h-2 w-2 rounded-full ${
                    index === activeIndex ? "bg-blue-600" : "bg-gray-300"
                  }`}
                  aria-label={`Go to screenshot ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 