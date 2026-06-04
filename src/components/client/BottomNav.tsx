"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, User } from "lucide-react";

const tabs = [
  { href: "/app/agenda", icon: Calendar, label: "Agenda" },
  { href: "/app/perfil", icon: User, label: "Perfil" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div style={{ borderTop: "1px solid var(--border)", background: "white", padding: "10px 0 6px", display: "flex", justifyContent: "space-around", flexShrink: 0 }}>
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link key={tab.href} href={tab.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "4px 48px", textDecoration: "none", opacity: isActive ? 1 : 0.45, transition: "opacity 0.2s" }}>
            <Icon size={20} color={isActive ? "var(--gold)" : "var(--text-light)"} />
            <span style={{ fontSize: 10, fontFamily: "var(--font-poppins)", fontWeight: isActive ? 600 : 400, color: isActive ? "var(--gold)" : "var(--text-light)" }}>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
