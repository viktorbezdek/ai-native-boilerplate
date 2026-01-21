"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "📊",
    iconLabel: "Dashboard icon",
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

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <ul className="space-y-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname?.startsWith(item.href));

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
      })}
    </ul>
  );
}
