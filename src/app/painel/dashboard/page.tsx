"use client";

import { useRouter } from "next/navigation";
import { Bell, Plus, DollarSign, Calendar, BarChart3, Info } from "lucide-react";
import { defaultAppointments, defaultFixedCosts, statusColors } from "@/lib/data";
import { fmt } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();

  const todayAppts = defaultAppointments;
  const dayRevenue = todayAppts.filter(a => a.status !== "pendente").reduce((a, c) => a + c.price, 0);
  const totalFixed = defaultFixedCosts.reduce((a, c) => a + c.val, 0);

  const kpis = [
    { label: "Receita Hoje", val: fmt(dayRevenue), sub: "2 atend. concluídos", icon: DollarSign, color: "oklch(72% 0.115 75)", bg: "oklch(97% 0.045 75)" },
    { label: "Agend. Hoje", val: "4", sub: "1 pendente", icon: Calendar, color: "oklch(60% 0.1 250)", bg: "oklch(97% 0.03 250)" },
    { label: "Receita Mensal", val: fmt(6840), sub: "+12% vs mês ant.", icon: BarChart3, color: "oklch(60% 0.1 145)", bg: "oklch(97% 0.03 145)" },
    { label: "Ticket Médio", val: fmt(118), sub: "Últimos 30 dias", icon: Info, color: "oklch(60% 0.1 320)", bg: "oklch(97% 0.03 320)" },
  ];

  return (
    <div style={{ padding: "28px 32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 30, fontWeight: 600, color: "var(--text)" }}>Bom dia, Levi! 🌸</h1>
          <p style={{ fontSize: 13, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 3 }}>Segunda-feira, 5 de Maio de 2026</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ padding: "9px 18px", borderRadius: 10, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
            <Bell size={14} color="var(--text-mid)" /> 3 alertas
          </button>
          <button onClick={() => router.push("/painel/agenda")} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-poppins)", color: "white", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.35)" }}>
            <Plus size={14} color="white" /> Novo agend.
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {kpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} style={{ background: "white", borderRadius: 16, padding: 18, border: "1px solid var(--border)", boxShadow: "0 1px 6px oklch(40% 0.04 340 / 0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontWeight: 500, letterSpacing: "0.03em" }}>{k.label}</p>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: k.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} color={k.color} />
                </div>
              </div>
              <p style={{ fontFamily: "var(--font-playfair)", fontSize: 26, fontWeight: 600, color: "var(--text)" }}>{k.val}</p>
              <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 4 }}>{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* Today's appointments */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 16 }}>Agenda de Hoje</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todayAppts.map((a, i) => {
              const sc = statusColors[a.status] || statusColors.pendente;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: "oklch(98% 0.01 75)", border: "1px solid var(--border)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "linear-gradient(135deg, oklch(88% 0.055 10), oklch(84% 0.065 350))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "var(--font-poppins)", color: "var(--mauve)" }}>{a.time}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)" }}>{a.name}</p>
                    <p style={{ fontSize: 11, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.svc}</p>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)" }}>{fmt(a.price)}</p>
                    <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "var(--font-poppins)", padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.color }}>{a.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fixed costs */}
        <div style={{ background: "white", borderRadius: 16, padding: 20, border: "1px solid var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>Custos Fixos/Mês</h3>
          <p style={{ fontSize: 12, color: "var(--text-light)", fontFamily: "var(--font-poppins)", marginBottom: 14 }}>
            Total: <strong style={{ color: "var(--text)" }}>{fmt(totalFixed)}</strong>
          </p>
          {defaultFixedCosts.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>{c.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 60, height: 5, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ width: `${(c.val / totalFixed) * 100}%`, height: "100%", background: "linear-gradient(90deg, oklch(88% 0.055 10), var(--gold))", borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)", fontFamily: "var(--font-poppins)", minWidth: 60, textAlign: "right" }}>{fmt(c.val)}</span>
              </div>
            </div>
          ))}
          <button onClick={() => router.push("/painel/financeiro")} style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 10, border: "1.5px solid var(--gold)", background: "transparent", cursor: "pointer", fontFamily: "var(--font-poppins)", fontSize: 12, fontWeight: 600, color: "var(--gold)" }}>
            Gerenciar Custos →
          </button>
        </div>
      </div>
    </div>
  );
}
