"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarDays, History, Home, LogIn, LogOut, Shield, Users, UserRound } from "lucide-react";
import { useApp } from "@/components/app-provider";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: Home, adminOnly: false },
  { href: "/teams", label: "Teams", icon: Users, adminOnly: false },
  { href: "/players", label: "Players", icon: UserRound, adminOnly: true },
  { href: "/matches", label: "Match", icon: CalendarDays, adminOnly: true },
  { href: "/history", label: "History", icon: History, adminOnly: false },
  { href: "/statistics", label: "Stats", icon: BarChart3, adminOnly: false }
];

export function PageShell({
  title,
  action,
  children
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAdmin, userEmail, logout } = useApp();
  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="app-frame">
      <header className="topbar">
        <div>
          <Link className="brand-logo-link" href="/" aria-label="VolleyStats home">
            <img src="/brand/volleystats-logo.png" alt="VolleyStats" />
          </Link>
          <h1>{title}</h1>
        </div>
        <div className="topbar-actions">
          {action}
          <div className={cn("mode-pill", isAdmin ? "mode-admin" : "mode-guest")}>
            <Shield size={15} />
            <span>{isAdmin ? "Admin" : "Guest"}</span>
          </div>
          {isAdmin ? (
            <button className="icon-button" type="button" onClick={() => void logout()} title="Log out">
              <LogOut size={18} />
            </button>
          ) : (
            <Link className="icon-button" href="/login" title="Admin login">
              <LogIn size={18} />
            </Link>
          )}
        </div>
      </header>
      {userEmail ? <p className="signed-in">Signed in as {userEmail}</p> : null}
      <main>{children}</main>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} className={cn("bottom-nav-item", active && "active")} href={item.href}>
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
