'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-indigo-100 via-white to-blue-100">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:gap-12 items-center">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-gray-900">
                Meet Your Virtual Cofounder
              </h1>
              <p className="max-w-[600px] text-gray-600 md:text-xl">
                VirtualCofounder.ai is the AI partner that helps you get your projects live and growing. 
                It analyzes your GitHub and Vercel activity, proposes smart tasks, and keeps your 
                development on track—just like a real cofounder would.
              </p>
            </div>
            <div className="flex flex-col gap-2 min-[400px]:flex-row">
              <Link href="/api/auth/signin">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Sign in with GitHub
                </Button>
              </Link>
              <Button variant="outline" size="lg" asChild>
                <Link href="#how-it-works">
                  See How It Works
                </Link>
              </Button>
            </div>
          </div>
          <div className="relative h-[350px] lg:h-[500px] rounded-xl overflow-hidden border border-gray-200 shadow-lg">
            <Image
              src="/screenshots/dashboard-desktop.png"
              alt="VirtualCofounder.ai dashboard overview"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
} 