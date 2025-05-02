'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="w-full py-12 md:py-24 bg-blue-600 text-white">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2 max-w-[800px]">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Get Your Virtual Cofounder Today</h2>
            <p className="mx-auto max-w-[700px] text-blue-100 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Start receiving AI-powered guidance and recommendations in less than 2 minutes.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/api/auth/signin">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                Get Started For Free
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="border-white text-white hover:bg-blue-700" asChild>
              <Link href="#how-it-works">
                Watch Demo
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
} 