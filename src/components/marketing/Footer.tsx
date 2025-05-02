'use client';

import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-6 bg-white border-t">
      <div className="container px-4 md:px-6 mx-auto">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            <h3 className="text-lg font-bold">VirtualCofounder.ai</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your AI partner for project development and growth
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/features" className="text-sm text-gray-500 hover:text-gray-900">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/use-cases" className="text-sm text-gray-500 hover:text-gray-900">
                    Use Cases
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/documentation" className="text-sm text-gray-500 hover:text-gray-900">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-900">
                    Blog
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Company</h4>
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-sm text-gray-500 hover:text-gray-900">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-6 mt-6 md:flex-row">
          <p className="text-xs text-gray-500">© 2025 VirtualCofounder.ai. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="text-xs text-gray-500 hover:text-gray-900">
              Twitter
            </Link>
            <Link href="#" className="text-xs text-gray-500 hover:text-gray-900">
              GitHub
            </Link>
            <Link href="#" className="text-xs text-gray-500 hover:text-gray-900">
              LinkedIn
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 