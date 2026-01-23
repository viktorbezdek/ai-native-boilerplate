"use client";

import { cn } from "@repo/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  title: string;
  href: string;
  icon: string;
  iconLabel: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    iconLabel: "Dashboard icon",
  },
  {
    title: "Library",
    href: "/library",
    icon: "📚",
    iconLabel: "Library icon",
  },
  {
    title: "Projects",
    href: "/dashboard/projects",
    icon: "📁",
    iconLabel: "Projects folder icon",
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: "📈",
    iconLabel: "Analytics chart icon",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: "⚙️",
    iconLabel: "Settings gear icon",
  },
];

const adminNavItems: NavItem[] = [
  {
    title: "Overview",
    href: "/admin",
    icon: "📊",
    iconLabel: "Admin overview icon",
    adminOnly: true,
  },
  {
    title: "Assets",
    href: "/admin/assets",
    icon: "🗃️",
    iconLabel: "Assets icon",
    adminOnly: true,
  },
  {
    title: "Subscribers",
    href: "/admin/subscribers",
    icon: "👥",
    iconLabel: "Subscribers icon",
    adminOnly: true,
  },
];

interface DashboardNavProps {
  isAdmin?: boolean;
}

export function DashboardNav({ isAdmin = false }: DashboardNavProps) {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem) => {
    const isActive =
      pathname === item.href ||
      (item.href !== "/dashboard" &&
        item.href !== "/admin" &&
        pathname?.startsWith(item.href));

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          aria-current={isActive ? "page" : undefined}
        >
          <span className="text-lg" role="img" aria-label={item.iconLabel}>
            {item.icon}
          </span>
          {item.title}
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <ul className="space-y-1">{navItems.map(renderNavItem)}</ul>

      {isAdmin && (
        <div className="border-t pt-4">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Admin
          </p>
          <ul className="space-y-1">{adminNavItems.map(renderNavItem)}</ul>
        </div>
      )}
    </div>
  );
}
