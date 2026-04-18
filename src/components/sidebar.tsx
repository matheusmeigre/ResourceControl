"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Briefcase,
  AppWindow,
  Users,
  LogOut,
  Settings2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/jobs", icon: Briefcase, label: "Jobs" },
  { href: "/applications", icon: AppWindow, label: "Aplicações" },
];

const adminItems = [
  { href: "/admin/users", icon: Users, label: "Usuários" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAdmin = session?.user?.roleName === "admin";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const navLink = (active: boolean) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
      active
        ? "bg-blue-500/10 text-blue-400 font-medium"
        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
    );

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col border-r border-slate-800/60">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800/60">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/50">
          <Settings2 className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight text-slate-100 truncate">Controle de</p>
          <p className="text-[11px] text-slate-500 leading-tight truncate">Ajuste de Recurso</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.href} className="relative">
              {active && (
                <span className="absolute -left-3 top-1.75 bottom-1.75 w-0.75 bg-blue-500 rounded-r-full" />
              )}
              <Link href={item.href} className={navLink(active)}>
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
                {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
              </Link>
            </div>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-5 pb-1.5 px-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Administração
              </p>
            </div>
            {adminItems.map((item) => {
              const active = isActive(item.href);
              return (
                <div key={item.href} className="relative">
                  {active && (
                    <span className="absolute -left-3 top-1.75 bottom-1.75 w-0.75 bg-blue-500 rounded-r-full" />
                  )}
                  <Link href={item.href} className={navLink(active)}>
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                    {active && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                  </Link>
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Theme Toggle */}
      <div className="border-t border-slate-800/60">
        <ThemeToggle />
      </div>

      {/* User */}
      <div className="px-3 pb-3 pt-2 border-t border-slate-800/60">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg group hover:bg-white/5 transition-colors">
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center shrink-0 ring-2 ring-blue-500/20">
            <span className="text-xs font-bold text-white">
              {session?.user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-200 truncate leading-tight">
              {session?.user?.name}
            </p>
            <p className="text-[11px] text-slate-500 truncate capitalize leading-tight">
              {session?.user?.roleName}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-red-400"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
