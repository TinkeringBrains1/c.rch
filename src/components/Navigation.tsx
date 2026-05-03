'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <nav className="bg-white border-b-[3px] border-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo.png"
              alt="C.RCH logo"
              className="w-10 h-10 rounded-full group-hover:scale-110 transition-transform"
            />
            <span className="text-2xl font-bold text-black tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
              C.RCH
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
          </div>

          {/* User Profile / Auth */}
          <div className="hidden md:flex items-center gap-4">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 bg-white border-[2px] border-black rounded-lg px-4 py-2 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full border-2 border-black"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center border-2 border-black">
                      <span className="text-white font-bold">
                        {session.user?.name?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-black">
                    {session.user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      isProfileOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border-[2px] border-black rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="px-4 py-3 border-b-[2px] border-black">
                      <p className="text-sm font-medium text-black">
                        {session.user?.name}
                      </p>
                      <p className="text-xs text-gray-600 truncate">
                        {session.user?.email}
                      </p>
                    </div>
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-sm text-black hover:bg-[#F5F1E8] transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className="bg-black text-white font-semibold px-6 py-2 rounded-lg hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
              >
                Get Started
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg border-[2px] border-black"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t-[2px] border-black bg-white">
          <div className="px-4 py-4 space-y-3">

            {session ? (
              <>
                <div className="pt-3 border-t-[2px] border-black">
                  <p className="text-sm font-medium text-black mb-1">
                    {session.user?.name}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {session.user?.email}
                  </p>
                  <button
                    onClick={() => signOut()}
                    className="w-full bg-black text-white font-semibold px-4 py-2 rounded-lg"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="block w-full bg-black text-white text-center font-semibold px-4 py-2 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

// Made with Bob
