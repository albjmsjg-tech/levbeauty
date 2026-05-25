"use client";

import { useState, useEffect } from "react";
import { Calendar, Bell, Settings, LogOut, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClientPerfilPage() {
  const router = useRouter();
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (profile?.full_name) setName(profile.full_name as string);
    }
    load();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const menuItems = [
    { icon: Calendar,  label: "Meus Agendamentos",  sub: "Ver ativos e histórico", href: "/app/agenda",  danger: false },
    { icon: Bell,      label: "Notificações",        sub: "WhatsApp ativado",        href: "/app",         danger: false },
    { icon: Settings,  label: "Configurações",       sub: "Perfil e privacidade",    href: "/app",         danger: false },
  ];

  return (
    <div>
      <div style={{ background: "#B89A8F", padding: "28px 20px 36px", textAlign: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold), oklch(65% 0.1 10))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 28 }}>👩</div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--mauve-dark)" }}>
          {name || "..."}
        </h2>
        {email && (
          <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>{email}</p>
        )}
      </div>

      <div style={{ padding: 20 }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} onClick={() => router.push(item.href)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "oklch(96% 0.025 75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color="var(--text-mid)" />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>{item.label}</p>
                {item.sub && <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 1 }}>{item.sub}</p>}
              </div>
              <ChevronRight size={14} color="var(--text-light)" />
            </div>
          );
        })}

        {/* Sair */}
        <div onClick={handleLogout}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "oklch(95% 0.04 15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogOut size={16} color="oklch(55% 0.12 15)" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-poppins)", color: "oklch(55% 0.12 15)" }}>Sair</p>
          </div>
        </div>
      </div>
    </div>
  );
}
