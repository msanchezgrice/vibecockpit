'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface PricingCardProps {
  name: string;
  price: number | string;
  desc: string;
  bullets: string[];
  cta: string;
  isHighlighted?: boolean;
  isAnnual?: boolean;
}

export function PricingCard({ 
  name, 
  price, 
  desc, 
  bullets, 
  cta, 
  isHighlighted = false,
  isAnnual = false
}: PricingCardProps) {
  // Apply annual discount if price is a number and annual is selected
  const displayPrice = typeof price === 'number' 
    ? isAnnual 
      ? Math.round(price * 0.8) 
      : price
    : price;

  return (
    <Card className={`flex flex-col h-full overflow-hidden ${
      isHighlighted ? 'border-blue-500 shadow-lg' : 'border-gray-200'
    }`}>
      {isHighlighted && (
        <div className="bg-blue-500 text-white text-center py-1 text-sm font-medium">
          Most Popular
        </div>
      )}
      <CardHeader className={`${isHighlighted ? 'bg-blue-50' : ''}`}>
        <div className="flex items-baseline justify-between">
          <CardTitle className="text-xl font-bold">{name}</CardTitle>
        </div>
        <div className="mt-4">
          <span className="text-4xl font-bold">
            {typeof displayPrice === 'number' ? `$${displayPrice}` : displayPrice}
          </span>
          {typeof price === 'number' && (
            <span className="text-gray-500 ml-1">/mo{isAnnual ? ', billed annually' : ''}</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">{desc}</p>
      </CardHeader>
      <CardContent className="flex-grow">
        <ul className="space-y-3 mt-4">
          {bullets.map((bullet) => (
            <li key={bullet} className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className={`${isHighlighted ? 'bg-blue-50' : ''}`}>
        <Button 
          variant={isHighlighted ? "default" : "outline"} 
          size="lg" 
          className={`w-full ${isHighlighted ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
        >
          {cta}
        </Button>
      </CardFooter>
    </Card>
  );
} 