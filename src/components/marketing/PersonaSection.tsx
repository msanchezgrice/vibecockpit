'use client';

import Image from "next/image";

interface PersonaSectionProps {
  name: string;
  pain: string;
  gain: string;
  img: string;
  reversed?: boolean;
}

export function PersonaSection({ name, pain, gain, img, reversed = false }: PersonaSectionProps) {
  return (
    <div className="py-16 border-b border-gray-100 last:border-0">
      <div className={`grid gap-8 items-center ${reversed ? 'md:grid-cols-[1fr_1.2fr]' : 'md:grid-cols-[1.2fr_1fr]'}`}>
        <div className={`space-y-6 ${reversed ? 'md:order-2' : ''}`}>
          <h2 className="text-3xl font-bold tracking-tight">{name}</h2>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <h3 className="font-medium text-red-900 mb-1">The Challenge</h3>
              <p className="text-gray-700">{pain}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <h3 className="font-medium text-green-900 mb-1">The Solution</h3>
              <p className="text-gray-700">{gain}</p>
            </div>
          </div>
        </div>
        
        <div className={`relative h-[300px] md:h-[400px] rounded-xl overflow-hidden shadow-lg ${reversed ? 'md:order-1' : ''}`}>
          <Image
            src={img}
            alt={`${name} using VirtualCofounder.ai`}
            fill
            className="object-cover"
          />
        </div>
      </div>
    </div>
  );
} 