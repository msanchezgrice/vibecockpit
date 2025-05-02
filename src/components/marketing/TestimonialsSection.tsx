'use client';

import { Card, CardContent } from "@/components/ui/card";
import { QuoteIcon } from "lucide-react";

export function TestimonialsSection() {
  return (
    <section className="w-full py-12 md:py-24 bg-gray-50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="space-y-2 max-w-[800px]">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">What Founders Are Saying</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Hear from teams who&apos;ve accelerated their projects with our AI cofounder
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <QuoteIcon className="h-8 w-8 text-blue-400 mb-4" />
              <blockquote className="text-lg font-medium leading-relaxed mb-4">
                &quot;Having VirtualCofounder.ai is like having a technical co-founder who&apos;s always available. 
                The task recommendations have accelerated our development by weeks.&quot;
              </blockquote>
              <footer className="mt-4">
                <cite className="not-italic">
                  <div className="font-medium">Sarah Chen</div>
                  <div className="text-sm text-gray-500">Solo Founder at TechStartup</div>
                </cite>
              </footer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <QuoteIcon className="h-8 w-8 text-blue-400 mb-4" />
              <blockquote className="text-lg font-medium leading-relaxed mb-4">
                &quot;The AI detected an overlooked security issue in our deployment process and suggested a fix before we launched. 
                It&apos;s like having a senior developer watching your back 24/7.&quot;
              </blockquote>
              <footer className="mt-4">
                <cite className="not-italic">
                  <div className="font-medium">Marcus Johnson</div>
                  <div className="text-sm text-gray-500">CTO at DataFlow</div>
                </cite>
              </footer>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <QuoteIcon className="h-8 w-8 text-blue-400 mb-4" />
              <blockquote className="text-lg font-medium leading-relaxed mb-4">
                &quot;As someone managing multiple projects simultaneously, VirtualCofounder.ai helps me prioritize 
                what matters and suggests optimizations I wouldn&apos;t have thought of myself.&quot;
              </blockquote>
              <footer className="mt-4">
                <cite className="not-italic">
                  <div className="font-medium">Anya Patel</div>
                  <div className="text-sm text-gray-500">Indie Developer</div>
                </cite>
              </footer>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
} 