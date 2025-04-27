import React from 'react';
import SessionProvider from "../SessionProvider"; // Needs SessionProvider too
import { Inter } from "next/font/google"; // Or your chosen font
import "../globals.css"; // Import globals

const inter = Inter({ subsets: ["latin"] });

// Layout for authenticated pages (e.g., dashboard)
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Add authentication check/redirect here later using middleware or directly
  return (
     <SessionProvider> {/* SessionProvider is crucial here */}
       <div className={`min-h-screen flex flex-col ${inter.className}`}> {/* Use font class */}
          {/* Optional: Add Navbar/Header specific to authenticated users */} 
          <main className="flex-grow">
            {children}
          </main>
          {/* Optional: Add Footer specific to authenticated users */} 
       </div>
     </SessionProvider>
  );
} 