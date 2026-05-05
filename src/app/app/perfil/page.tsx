"use client";

import { Calendar, Star, Bell, Settings, LogOut, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const menuItems = [
  { icon: Calendar, label: "Histórico de Agendamentos", sub: "12 atendimentos", href: "/app/agenda" },
  { icon: Star, label: "Serviços Favoritos", sub: "Alongamento em Gel", href: "/app" },
  { icon: Bell, label: "Notificações", sub: "WhatsApp + Push ativado", href: "/app" },
  { icon: Settings, label: "Configurações", sub: "Perfil e privacidade", href: "/app" },
  { icon: LogOut, label: "Sair", sub: "", href: "/login", danger: true },
];

export default function ClientPerfilPage() {
  const router = useRouter();

  return (
    <div>
      <div style={{ background: "linear-gradient(160deg, oklch(88% 0.055 10), oklch(82% 0.065 350))", padding: "28px 20px 36px", textAlign: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg, var(--gold), oklch(65% 0.1 10))", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontSize: 28 }}>👩</div>
        <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 24, fontWeight: 600, color: "var(--mauve-dark)" }}>Fernanda Silva</h2>
        <p style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>fernanda@email.com</p>
      </div>

      <div style={{ padding: 20 }}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} onClick={() => router.push(item.href)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 0", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: item.danger ? "oklch(95% 0.04 15)" : "oklch(96% 0.025 75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={16} color={item.danger ? "oklch(55% 0.12 15)" : "var(--text-mid)"} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--font-poppins)", color: item.danger ? "oklch(55% 0.12 15)" : "var(--text)" }}>{item.label}</p>
                {item.sub && <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 1 }}>{item.sub}</p>}
              </div>
              {!item.danger && <ChevronRight size={14} color="var(--text-light)" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
