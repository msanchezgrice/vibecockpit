'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, LineChart, MessageSquare, ListChecks, BellRing, Plug } from "lucide-react";
import Image from "next/image";

interface FeatureCardProps {
  title: string;
  body: string;
  icon: string;
  img?: string;
}

// Map of icon names to their components
const iconMap: Record<string, React.ReactNode> = {
  Brain: <Brain className="h-10 w-10 text-blue-500 mb-2" />,
  LineChart: <LineChart className="h-10 w-10 text-blue-500 mb-2" />,
  MessageSquare: <MessageSquare className="h-10 w-10 text-blue-500 mb-2" />,
  ListChecks: <ListChecks className="h-10 w-10 text-blue-500 mb-2" />,
  BellRing: <BellRing className="h-10 w-10 text-blue-500 mb-2" />,
  Plug: <Plug className="h-10 w-10 text-blue-500 mb-2" />,
};

export function FeatureCard({ title, body, icon, img }: FeatureCardProps) {
  return (
    <Card className="flex flex-col h-full transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-2">
        {iconMap[icon] || <Brain className="h-10 w-10 text-blue-500 mb-2" />}
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <p className="text-gray-500">{body}</p>
        {img && (
          <div className="relative w-full h-48 mt-4 rounded-md overflow-hidden">
            <Image 
              src={img} 
              alt={title} 
              fill 
              className="object-cover" 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
} 