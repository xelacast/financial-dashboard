"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "~/server/better-auth/client";

interface SidebarUser {
  name: string;
  email: string;
}

interface SidebarProps {
  user: SidebarUser;
}

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Tracker", href: "/tracker", active: true },
  { label: "Transactions", href: "#", active: false },
  { label: "Budgets", href: "#", active: false },
  { label: "Accounts", href: "#", active: false },
  { label: "Goals", href: "#", active: false },
] as const;

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  function handleSignOut() {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-mauve-shadow-950">
      {/* Brand */}
      <div className="border-b border-dusty-lavender-800 px-6 py-5">
        <span className="text-xl font-bold tracking-tight text-slate-grey-50">
          Fintrack
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_LINKS.map(({ label, href, active }) => {
          const isCurrent = active && pathname === href;
          const isDisabled = !active;

          if (isDisabled) {
            return (
              <span
                key={label}
                className="flex cursor-not-allowed items-center rounded-lg px-3 py-2.5 text-sm font-medium text-dusty-lavender-400 opacity-40"
              >
                {label}
              </span>
            );
          }

          return (
            <Link
              key={label}
              href={href}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isCurrent
                  ? "border-l-2 border-midnight-violet-500 bg-mauve-shadow-950 pl-[10px] text-midnight-violet-500"
                  : "text-dusty-lavender-400 hover:text-slate-grey-50"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User zone */}
      <div className="border-t border-dusty-lavender-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-midnight-violet-700 text-sm font-semibold text-slate-grey-50">
            {getInitial(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-grey-50">
              {user.name}
            </p>
            <p className="truncate text-xs text-dusty-lavender-400">
              {user.email}
            </p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-3 w-full rounded-lg px-3 py-2 text-left text-sm text-dusty-lavender-400 transition-colors hover:bg-dusty-lavender-800 hover:text-slate-grey-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
