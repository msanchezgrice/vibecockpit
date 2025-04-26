'use client';

import { signIn, signOut } from 'next-auth/react';

const buttonClass = "px-4 py-2 rounded text-white";

export function LoginButton() {
  return (
    <button
      className={`${buttonClass} bg-blue-600 hover:bg-blue-700`}
      onClick={() => signIn('github')}
    >
      Sign in with GitHub
    </button>
  );
}

export function LogoutButton() {
  return (
    <button
      className={`${buttonClass} bg-red-600 hover:bg-red-700`}
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      Sign Out
    </button>
  );
} 