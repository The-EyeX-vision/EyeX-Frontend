import Link from "next/link";
import Image from "next/image";
import { signOutAction } from "@/app/actions/signout";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur supports-[backdrop-filter]:bg-gray-950/60">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/image.jpeg"
            alt="EyeX Logo"
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg object-cover shadow-sm border border-gray-700/60"
          />
          <div>
            <p className="text-sm font-bold text-white leading-none">
              The Eye X
            </p>
            <p className="text-[10px] text-gray-500 leading-none mt-0.5">
              Smart Classroom Monitor
            </p>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-400">
          <Link
            href="/dashboard"
            className="hover:text-white text-gray-200 font-medium transition-colors"
          >
            Dashboard
          </Link>
          <a
            href="/api/alerts"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors"
          >
            API
          </a>
        </nav>

        {/* Live indicator + sign out */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-gray-800 hover:border-red-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
