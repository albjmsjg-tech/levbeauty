"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Calendar, DollarSign, Package, BarChart3, Settings, LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/painel/dashboard",    icon: Home,      label: "Dashboard"     },
  { href: "/painel/agenda",       icon: Calendar,  label: "Agenda"        },
  { href: "/painel/clientes",     icon: Users,     label: "Clientes"      },
  { href: "/painel/precificacao", icon: DollarSign, label: "Precificação" },
  { href: "/painel/insumos",      icon: Package,   label: "Insumos"       },
  { href: "/painel/financeiro",   icon: BarChart3, label: "Financeiro"    },
  { href: "/painel/configuracoes",icon: Settings,  label: "Configurações" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) console.error("[sidebar] profile fetch:", error.message);
          if (data?.full_name) setOwnerName(data.full_name as string);
        });
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div
      className="bg-onyx border-r border-cream/5 flex flex-col flex-shrink-0 h-screen sticky top-0"
      style={{ width: 220 }}
    >
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <Image src="/logo.png" width={120} height={40} alt="LevBeauty" />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {navItems.map(n => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 transition-colors duration-150",
                active
                  ? "bg-cream/10 text-blush"
                  : "text-cream/50 hover:bg-cream/5 hover:text-cream/80"
              )}
            >
              <Icon size={15} />
              <span className={cn("font-sans text-xs", active ? "font-semibold" : "font-normal")}>
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-cream/5">
        <div className="flex items-center gap-2.5 px-3 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-blush/20 flex items-center justify-center flex-shrink-0">
            <span className="font-sans text-xs font-semibold text-blush">
              {ownerName ? ownerName[0].toUpperCase() : "?"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-xs font-semibold text-cream truncate">{ownerName || "—"}</p>
            <p className="font-sans text-[10px] text-cream/40">Proprietária</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-cream/40 hover:text-cream/70 hover:bg-cream/5 transition-colors duration-150"
        >
          <LogOut size={13} />
          <span className="font-sans text-xs">Sair</span>
        </button>
      </div>
    </div>
  );
}
