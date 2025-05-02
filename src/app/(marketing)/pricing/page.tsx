'use client';

import { useState } from 'react';
import { PricingCard } from "@/components/ui/PricingCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false);

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
      bullets: ["Unlimited projects", "2,000 AI credits / mo", "Priority queue", "Email support"],
      cta: "Start 14-Day Trial",
      isHighlighted: true,
    },
    {
      name: "Startup",
      price: 49,
      desc: "Growing teams up to 5 members",
      bullets: ["Team dashboard", "10,000 AI credits / mo", "Slack alerts", "Priority email + chat"],
      cta: "Upgrade Now",
    },
    {
      name: "Enterprise",
      price: "Contact",
      desc: "Custom needs? We've got you.",
      bullets: ["SSO", "Custom seats", "Dedicated success manager", "Custom integrations"],
      cta: "Contact Sales",
    },
  ];

  return (
    <section className="container mx-auto px-4 py-12 md:py-24">
      <header className="max-w-3xl mx-auto mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
        <p className="text-xl text-gray-600 mb-8">
          Choose the plan that works for your projects
        </p>
        
        <div className="flex items-center justify-center space-x-2 mt-8">
          <Label htmlFor="billing-toggle" className="cursor-pointer">Monthly</Label>
          <Switch 
            id="billing-toggle" 
            checked={isAnnual} 
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-toggle" className="cursor-pointer">
            Annual
            <span className="ml-1.5 inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
              Save 20%
            </span>
          </Label>
        </div>
      </header>
      
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <PricingCard
            key={plan.name}
            {...plan} 
            isAnnual={isAnnual}
          />
        ))}
      </div>
      
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium mb-2">What are AI credits?</h3>
            <p className="text-gray-600">
              AI credits are used each time you interact with the AI cofounder. Different features 
              consume different numbers of credits based on complexity. The free plan comes with enough 
              credits to complete a small project.
            </p>
          </div>
          
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium mb-2">Can I upgrade or downgrade?</h3>
            <p className="text-gray-600">
              Yes, you can change plans at any time. If you upgrade, we&apos;ll prorate the remainder of your 
              billing period. If you downgrade, the new rate takes effect at your next billing cycle.
            </p>
          </div>
          
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium mb-2">How does the 14-day trial work?</h3>
            <p className="text-gray-600">
              Your trial gives you full access to all Pro features. No credit card is required, and you 
              can cancel anytime during the trial without being charged.
            </p>
          </div>
          
          <div className="border-b border-gray-200 pb-4">
            <h3 className="text-lg font-medium mb-2">What happens if I run out of AI credits?</h3>
            <p className="text-gray-600">
              You can purchase additional credit packs, or wait until your credits refresh at the start 
              of your next billing cycle. We&apos;ll always notify you before you run out.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
} 