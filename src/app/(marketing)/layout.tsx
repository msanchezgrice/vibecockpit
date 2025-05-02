import React from 'react';

// Minimalist layout for marketing pages
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Optional: Add a very simple header specific to marketing later */}
      <main className="flex-grow">
        {children}
      </main>
      {/* Optional: Add a very simple footer specific to marketing later */}
    </div>
  );
} 