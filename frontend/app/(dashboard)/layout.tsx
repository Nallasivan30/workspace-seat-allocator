"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Grid,
  BarChart3,
  Bot,
  LogOut,
  Search,
  User as UserIcon,
  Menu,
  X,
  PlusCircle,
  Sparkles,
  UserCheck,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: SidebarItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Employees", href: "/employees", icon: Users },
  { name: "Projects", href: "/projects", icon: Briefcase },
  { name: "Seat Layout", href: "/seats", icon: Grid },
  { name: "Allocations", href: "/allocations", icon: UserCheck },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Route guard
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-900 border-t-transparent dark:border-zinc-50 dark:border-t-transparent"></div>
          <span className="text-sm font-medium text-zinc-500">Loading Ethara...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-200/80 bg-white dark:bg-zinc-900 dark:border-zinc-800">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-zinc-200/80 dark:border-zinc-800">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-zinc-900 dark:text-white">
              <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              <span>Ethara</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group",
                    isActive
                      ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                      : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-50"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200 group-hover:scale-105",
                      isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Section Footer */}
          <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm shadow-sm">
                {user?.full_name?.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize truncate">{user?.role} Account</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-64 h-full">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between h-16 px-4 md:px-8 border-b border-zinc-200/80 bg-white dark:bg-zinc-900 dark:border-zinc-800 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-zinc-500 dark:text-zinc-400"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Global Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative max-w-xs md:max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Global search (min 2 chars)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 md:w-80 h-9 pl-9 pr-4 text-sm bg-zinc-50 hover:bg-zinc-100/80 focus:bg-white border border-zinc-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:bg-zinc-950 dark:border-zinc-800 dark:text-white dark:focus:bg-zinc-950"
              />
            </form>
          </div>

          <div className="flex items-center gap-3">
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 outline-none">
                  <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center text-xs font-medium border border-zinc-300 dark:border-zinc-700">
                    <UserIcon className="h-4 w-4" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-sm text-zinc-500 dark:text-zinc-400 truncate">
                  {user?.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Navigation Menu Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex flex-col w-full max-w-xs bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-full p-6 animate-in slide-in-from-left">
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-xl text-zinc-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  Ethara
                </span>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="space-y-1 flex-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                          : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <item.icon className="h-5 w-5 text-zinc-400 dark:text-zinc-500" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-auto">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-semibold text-sm">
                    {user?.full_name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{user?.full_name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{user?.role}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={logout} className="text-zinc-500 hover:text-red-600">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Children Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 focus:outline-none">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
