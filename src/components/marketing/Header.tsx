'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="w-full py-4 px-4 md:px-6 border-b bg-white">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">VirtualCofounder.ai</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Features
            </Link>
            <Link href="/use-cases" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Use Cases
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Blog
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            {session ? (
              <Link href="/dashboard">
                <Button variant="outline" className="border-blue-600 text-blue-600">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/api/auth/signin">
                  <Button variant="outline" className="border-blue-600 text-blue-600">
                    Log In
                  </Button>
                </Link>
                <Link href="/api/auth/signin">
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    Sign Up Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 space-y-4">
            <Link
              href="/features"
              className="block text-sm font-medium text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/use-cases"
              className="block text-sm font-medium text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              Use Cases
            </Link>
            <Link
              href="/pricing"
              className="block text-sm font-medium text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/blog"
              className="block text-sm font-medium text-gray-600 hover:text-gray-900"
              onClick={() => setIsMenuOpen(false)}
            >
              Blog
            </Link>
            
            <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
              {session ? (
                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/api/auth/signin" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Log In</Button>
                  </Link>
                  <Link href="/api/auth/signin" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full">Sign Up Free</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
} 