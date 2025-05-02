'use client';

import { Link2, LightbulbIcon, Zap } from "lucide-react";

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="w-full py-12 md:py-24 bg-gray-50">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
          <div className="inline-block rounded-lg bg-blue-100 px-3 py-1 text-sm text-blue-800">How It Works</div>
          <div className="space-y-2 max-w-[800px]">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Your Virtual Cofounder in Action</h2>
            <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              From connection to growth acceleration in three simple steps
            </p>
          </div>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-1/2 top-1/2 h-[calc(100%-80px)] w-0.5 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-blue-300 to-blue-600 hidden md:block"></div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 p-3">
                <Link2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">1. Connect</h3>
              <p className="mt-2 text-gray-500">
                Sign in with GitHub and connect your projects. Your virtual cofounder starts learning your development patterns immediately.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-200 p-3">
                <LightbulbIcon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">2. Receive Guidance</h3>
              <p className="mt-2 text-gray-500">
                Within minutes, get personalized task recommendations and insights based on project analysis and industry best practices.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center relative z-10">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-300 p-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold">3. Accelerate Growth</h3>
              <p className="mt-2 text-gray-500">
                Act on AI-powered suggestions, track progress on your dashboard, and watch your project reach completion faster than ever before.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 