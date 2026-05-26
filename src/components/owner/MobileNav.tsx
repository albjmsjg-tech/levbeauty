"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, Home, Calendar, DollarSign, Package, BarChart3, Settings, LogOut, Users, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/painel/dashboard",     icon: Home,       label: "Dashboard"     },
  { href: "/painel/agenda",        icon: Calendar,   label: "Agenda"        },
  { href: "/painel/clientes",      icon: Users,      label: "Clientes"      },
  { href: "/painel/precificacao",  icon: DollarSign, label: "Precificação"  },
  { href: "/painel/insumos",       icon: Package,    label: "Insumos"       },
  { href: "/painel/financeiro",    icon: BarChart3, label: "Financeiro"       },
  { href: "/painel/afiliadas",     icon: Gift,      label: "Indicar e Ganhar" },
  { href: "/painel/configuracoes", icon: Settings,  label: "Configurações"    },
];

export function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
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
          if (error) console.error("[mobile-nav] profile fetch:", error.message);
          if (data?.full_name) setOwnerName(data.full_name as string);
        });
    });
  }, []);

  // Close drawer when route changes
  useEffect(() => { setIsOpen(false); }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      {/* Top header bar — mobile only */}
      <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-onyx border-b border-cream/5 flex-shrink-0">
        <Image src="/logo.png" width={100} height={34} alt="LevBeauty" />
        <button
          onClick={() => setIsOpen(true)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-cream/60 hover:text-cream hover:bg-cream/5 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-onyx/60 z-40 lg:hidden transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-[240px] z-50 bg-onyx flex flex-col lg:hidden transition-transform duration-200 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer header with close button */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <Image src="/logo.png" width={100} height={34} alt="LevBeauty" />
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-cream/50 hover:text-cream hover:bg-cream/5 transition-colors"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav links */}
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

        {/* User section */}
        <div className="px-3 py-4 border-t border-cream/5 flex-shrink-0">
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
    </>
  );
}
