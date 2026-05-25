"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FichaAnamnese } from "@/components/clientes/FichaAnamnese";
import { updateClient, updateClientNotes } from "@/app/painel/clientes/actions";
import { fmt } from "@/lib/utils";
import { statusColors } from "@/lib/data";

type Tab = "dados" | "anamnese" | "historico" | "notas";

interface ClientData {
  id: string;
  name: string;
  phone: string;
  is_vip: boolean;
  is_blocked: boolean;
  notes: string | null;
  last_visit_at: string | null;
  birth_date: string | null;
  cep: string | null;
  allergies: string | null;
  has_diabetes: boolean;
  is_pregnant: boolean;
  uses_continuous_medication: boolean;
  other_conditions: string | null;
  preferences: string | null;
  technical_history: string | null;
  general_notes: string | null;
  lgpd_consent_at: string | null;
}

interface ApptRow {
  id: string;
  appt_date: string;
  appt_time: string;
  status: string;
  total_price: number;
  items: { service_name: string; price: number }[];
}

function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return p;
}

function formatCEP(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
}

export default function ClienteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [tab, setTab] = useState<Tab>("dados");
  const [client, setClient] = useState<ClientData | null>(null);
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Dados tab state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cep, setCep] = useState("");
  const [isVip, setIsVip] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [savingDados, setSavingDados] = useState(false);
  const [dadosMsg, setDadosMsg] = useState<string | null>(null);

  // Notas tab state
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesMsg, setNotesMsg] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      Promise.all([
        supabase.from("clients").select(`
          id, name, phone, is_vip, is_blocked, notes, last_visit_at, birth_date, cep,
          allergies, has_diabetes, is_pregnant, uses_continuous_medication,
          other_conditions, preferences, technical_history, general_notes, lgpd_consent_at
        `).eq("id", clientId).single(),
        supabase.from("appointments").select(`
          id, appt_date, appt_time, status, total_price,
          appointment_items(service_name, price)
        `).eq("client_id", clientId).order("appt_date", { ascending: false }),
      ]).then(([{ data: c }, { data: a }]) => {
        if (!c) { router.push("/painel/clientes"); return; }
        const cd = c as ClientData;
        setClient(cd);
        setName(cd.name);
        setPhone(formatPhone(cd.phone));
        setBirthDate(cd.birth_date ?? "");
        setCep(cd.cep ? formatCEP(cd.cep) : "");
        setIsVip(cd.is_vip);
        setIsBlocked(cd.is_blocked);
        setNotes(cd.notes ?? "");

        const mapped: ApptRow[] = (a ?? []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          appt_date: row.appt_date as string,
          appt_time: row.appt_time as string,
          status: row.status as string,
          total_price: Number(row.total_price) || 0,
          items: (row.appointment_items as { service_name: string; price: number }[] ?? []),
        }));
        setAppts(mapped);
        setLoading(false);
      });
    });
  }, [clientId, router]);

  const handleSaveDados = async () => {
    if (!client) return;
    setSavingDados(true);
    setDadosMsg(null);
    const result = await updateClient(clientId, { name, phone, birthDate: birthDate || null, cep: cep || null, isVip, isBlocked });
    setSavingDados(false);
    if (result.ok) {
      setDadosMsg("Salvo!");
      setClient(prev => prev ? { ...prev, name, is_vip: isVip, is_blocked: isBlocked } : prev);
      setTimeout(() => setDadosMsg(null), 2500);
    } else {
      setDadosMsg(result.error ?? "Erro ao salvar.");
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesMsg(null);
    const result = await updateClientNotes(clientId, notes);
    setSavingNotes(false);
    if (result.ok) { setNotesMsg("Salvo!"); setTimeout(() => setNotesMsg(null), 2500); }
    else setNotesMsg("Erro ao salvar.");
  };

  // Stats computed from appts
  const finishedAppts = appts.filter(a => a.status === "concluido" || a.status === "concluído");
  const totalVisits = finishedAppts.length;
  const totalSpent = finishedAppts.reduce((s, a) => s + a.total_price, 0);
  const ticketMedio = totalVisits > 0 ? totalSpent / totalVisits : 0;

  const avgFreqDays = (() => {
    if (finishedAppts.length < 2) return null;
    const dates = [...finishedAppts].sort((a, b) => a.appt_date.localeCompare(b.appt_date)).map(a => new Date(a.appt_date).getTime());
    const intervals = dates.slice(1).map((d, i) => (d - dates[i]) / 86400_000);
    return Math.round(intervals.reduce((s, v) => s + v, 0) / intervals.length);
  })();

  const topService = (() => {
    const counts: Record<string, number> = {};
    finishedAppts.forEach(a => a.items.forEach(i => { counts[i.service_name] = (counts[i.service_name] || 0) + 1; }));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? null;
  })();

  const field: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)",
    fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box",
  };

  const statCard = (label: string, value: string) => (
    <div style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", textAlign: "center" }}>
      <p style={{ fontFamily: "var(--font-poppins)", fontSize: 11, color: "var(--text-light)", marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 700, color: "var(--text)", margin: 0 }}>{value}</p>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: "40px 32px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-poppins)", color: "var(--text-light)" }}>Carregando...</p>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div style={{ padding: "28px 32px", maxWidth: 720, margin: "0 auto" }}>
      {/* Back */}
      <Link href="/painel/clientes" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", textDecoration: "none", marginBottom: 20 }}>
        <ArrowLeft size={14} /> Voltar
      </Link>

      {/* Client header */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", border: "1px solid var(--border)", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
          background: client.is_blocked
            ? "oklch(94% 0.03 15)"
            : client.is_vip
            ? "linear-gradient(135deg, oklch(88% 0.07 75), oklch(72% 0.115 75))"
            : "linear-gradient(135deg, oklch(92% 0.03 10), oklch(85% 0.04 340))",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
        }}>
          {client.is_blocked ? "🚫" : client.is_vip ? "⭐" : "👤"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0 }}>
              {client.name}
            </h1>
            {client.is_vip && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", background: "#F6F2EC", padding: "2px 10px", borderRadius: 10, border: "1px solid oklch(90% 0.05 75)" }}>VIP</span>}
            {client.is_blocked && <span style={{ fontSize: 11, fontWeight: 700, color: "oklch(48% 0.14 15)", background: "oklch(97% 0.03 15)", padding: "2px 10px", borderRadius: 10, border: "1px solid oklch(88% 0.05 15)" }}>Bloqueada</span>}
          </div>
          <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-light)", margin: 0 }}>
            {formatPhone(client.phone)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "oklch(95% 0.01 0)", borderRadius: 12, padding: 4 }}>
        {(["dados", "anamnese", "historico", "notas"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "9px 8px", borderRadius: 10, border: "none",
              background: tab === t ? "white" : "transparent",
              cursor: "pointer", fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "var(--text)" : "var(--text-light)",
              fontFamily: "var(--font-poppins)",
              boxShadow: tab === t ? "0 1px 4px oklch(20% 0.02 340 / 0.12)" : "none",
            }}>
            {t === "dados" ? "Dados" : t === "anamnese" ? "📋 Anamnese" : t === "historico" ? "Histórico" : "Notas"}
          </button>
        ))}
      </div>

      {/* ── Tab: DADOS ── */}
      {tab === "dados" && (
        <div style={{ background: "white", borderRadius: 16, padding: "24px", border: "1px solid var(--border)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} style={field} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>
                Telefone
                <span style={{ color: "oklch(60% 0.1 55)", fontWeight: 400, marginLeft: 6 }}>(é identificador único)</span>
              </label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={field} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Data de nascimento</label>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} style={field} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>CEP</label>
              <input type="text" value={cep} onChange={e => setCep(formatCEP(e.target.value))} placeholder="00000-000" style={field} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => setIsVip(v => !v)}
              style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${isVip ? "var(--gold)" : "var(--border)"}`, background: isVip ? "#F6F2EC" : "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: isVip ? "var(--gold)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
              <Star size={13} style={{ marginRight: 6, display: "inline" }} />{isVip ? "VIP ativo" : "Marcar como VIP"}
            </button>
            <button
              onClick={() => setIsBlocked(b => !b)}
              style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${isBlocked ? "oklch(88% 0.05 15)" : "var(--border)"}`, background: isBlocked ? "oklch(97% 0.03 15)" : "white", cursor: "pointer", fontSize: 13, fontWeight: 600, color: isBlocked ? "oklch(48% 0.14 15)" : "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
              <Ban size={13} style={{ marginRight: 6, display: "inline" }} />{isBlocked ? "Bloqueada" : "Bloquear"}
            </button>
          </div>

          {dadosMsg && (
            <p style={{ fontSize: 12, fontFamily: "var(--font-poppins)", marginBottom: 12, color: dadosMsg === "Salvo!" ? "oklch(42% 0.12 145)" : "oklch(48% 0.14 15)", padding: "8px 12px", background: dadosMsg === "Salvo!" ? "oklch(96% 0.06 145)" : "oklch(97% 0.03 15)", borderRadius: 8 }}>
              {dadosMsg}
            </p>
          )}

          <button
            onClick={handleSaveDados}
            disabled={savingDados}
            style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "var(--gold)", cursor: savingDados ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "white", fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px rgba(184,154,143,0.2)" }}>
            {savingDados ? "Salvando..." : "Salvar dados"}
          </button>
        </div>
      )}

      {/* ── Tab: ANAMNESE ── */}
      {tab === "anamnese" && (
        <div style={{ background: "white", borderRadius: 16, padding: "24px", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 20, fontWeight: 600, color: "var(--text)", margin: 0 }}>Anamnese</h2>
          </div>
          <FichaAnamnese client={client} />
        </div>
      )}

      {/* ── Tab: HISTÓRICO ── */}
      {tab === "historico" && (
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 20 }}>
            {statCard("Visitas", String(totalVisits))}
            {statCard("Total gasto", fmt(totalSpent))}
            {statCard("Ticket médio", totalVisits > 0 ? fmt(ticketMedio) : "—")}
            {statCard("Frequência", avgFreqDays != null ? `${avgFreqDays}d` : "—")}
            {topService && statCard("Serviço fav.", topService.length > 14 ? topService.slice(0, 14) + "…" : topService)}
          </div>

          {/* Appointments list */}
          {appts.length === 0 ? (
            <div style={{ background: "white", borderRadius: 16, padding: "40px 24px", border: "1px solid var(--border)", textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-poppins)", color: "var(--text-light)", fontSize: 14 }}>Nenhum agendamento registrado.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {appts.map(a => {
                const sc = statusColors[a.status] ?? statusColors["pendente"];
                const dateLabel = new Date(a.appt_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
                return (
                  <div key={a.id} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                          {dateLabel} às {a.appt_time}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8, background: sc.bg, color: sc.color, fontFamily: "var(--font-poppins)" }}>
                          {a.status}
                        </span>
                      </div>
                      <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", margin: 0 }}>
                        {a.items.map(i => i.service_name).join(", ") || "—"}
                      </p>
                    </div>
                    <span style={{ fontFamily: "var(--font-playfair)", fontSize: 16, fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>
                      {fmt(a.total_price)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: NOTAS ── */}
      {tab === "notas" && (
        <div style={{ background: "white", borderRadius: 16, padding: "24px", border: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)", marginBottom: 12 }}>
            Notas privadas da profissional sobre esta cliente.
          </p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={10}
            placeholder="Anotações pessoais, lembretes, observações..."
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text)", resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6, marginBottom: 16 }}
          />
          {notesMsg && (
            <p style={{ fontSize: 12, fontFamily: "var(--font-poppins)", marginBottom: 12, color: notesMsg === "Salvo!" ? "oklch(42% 0.12 145)" : "oklch(48% 0.14 15)", padding: "8px 12px", background: notesMsg === "Salvo!" ? "oklch(96% 0.06 145)" : "oklch(97% 0.03 15)", borderRadius: 8 }}>
              {notesMsg}
            </p>
          )}
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: "var(--gold)", cursor: savingNotes ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "white", fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px rgba(184,154,143,0.2)" }}>
            {savingNotes ? "Salvando..." : "Salvar notas"}
          </button>
        </div>
      )}
    </div>
  );
}
