'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, LineChart, Rocket, ListChecks } from "lucide-react";
import Link from "next/link";

export function FeaturesSection() {
  return (
    <section className="w-full py-12 md:py-24 bg-white">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2 max-w-[800px]">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">How Your Virtual Cofounder Helps</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Get intelligent recommendations and insights that accelerate your project growth
            </p>
          </div>
        </div>

        <div className="mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <Brain className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>Proactive Task Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-gray-500">Your AI cofounder analyzes your project activity and proposes actionable tasks to move your project forward—no more wondering what to focus on next.</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <LineChart className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>Project Dashboard</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-gray-500">Get a unified view of costs, development activity, and analytics across GitHub and Vercel projects to make informed decisions.</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <ListChecks className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>Launch Guidance</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-gray-500">Follow AI-powered checklists customized to your project needs, with web research and best practices built in.</p>
            </CardContent>
          </Card>

          <Card className="flex flex-col h-full">
            <CardHeader className="pb-2">
              <Rocket className="h-10 w-10 text-blue-500 mb-2" />
              <CardTitle>Development Insights</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-gray-500">Receive timely suggestions based on your codebase evolution and deployment patterns to optimize your workflow.</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Link href="/features" className="text-blue-600 hover:text-blue-800 font-medium underline underline-offset-4">
            Explore all features →
          </Link>
        </div>
      </div>
    </section>
  );
} 