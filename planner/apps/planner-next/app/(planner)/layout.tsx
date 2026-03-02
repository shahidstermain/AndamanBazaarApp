import Link from "next/link";
import { createClient } from "../../lib/supabase/server";

export default async function PlannerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-teal-700 text-lg">
            🏝️ <span>Andaman Planner Pro</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/itineraries"
              className="text-sm text-gray-600 hover:text-teal-700 transition-colors"
            >
              My Trips
            </Link>
            {user && (
              <span className="text-xs text-gray-400 max-w-[120px] truncate hidden sm:block">
                {user.email}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>

      <footer className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
        Andaman Planner Pro · Part of{" "}
        <a href="https://andamanbazaar.in" className="text-teal-600 hover:underline">
          AndamanBazaar.in
        </a>
      </footer>
    </div>
  );
}
