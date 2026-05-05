"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Calendar, DollarSign, Package, BarChart3, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/painel/dashboard", icon: Home, label: "Dashboard" },
  { href: "/painel/agenda", icon: Calendar, label: "Agenda" },
  { href: "/painel/precificacao", icon: DollarSign, label: "Precificação" },
  { href: "/painel/insumos", icon: Package, label: "Insumos" },
  { href: "/painel/financeiro", icon: BarChart3, label: "Financeiro" },
  { href: "/painel/configuracoes", icon: Settings, label: "Configurações" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div style={{ width: 220, background: "white", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0, height: "100vh", position: "sticky", top: 0 }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>💅</div>
          <div>
            <p style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--mauve-dark)", lineHeight: 1 }}>LevBeauty</p>
            <p style={{ fontSize: 10, color: "var(--text-light)", letterSpacing: "0.06em", fontWeight: 500 }}>GESTÃO</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
        {navItems.map(n => {
          const active = pathname === n.href;
          const Icon = n.icon;
          return (
            <Link key={n.href} href={n.href}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: active ? "oklch(96% 0.04 75)" : "transparent", marginBottom: 2, textDecoration: "none", transition: "background 0.15s" }}>
              <Icon size={16} color={active ? "var(--gold)" : "var(--text-light)"} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "var(--text)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{n.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, oklch(85% 0.07 10), oklch(72% 0.115 75))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👩</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Levi Santos</p>
            <p style={{ fontSize: 10, color: "var(--text-light)", fontFamily: "var(--font-poppins)" }}>Proprietária</p>
          </div>
        </div>
        <button onClick={handleLogout}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-mid)" }}>
          <LogOut size={14} color="var(--text-light)" />
          <span style={{ fontSize: 12, fontFamily: "var(--font-poppins)", color: "var(--text-light)" }}>Sair</span>
        </button>
      </div>
    </div>
  );
}
