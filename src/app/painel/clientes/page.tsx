"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addClient, type ClientInput } from "./actions";
import { fmt } from "@/lib/utils";

interface ClientRow {
  id: string;
  name: string;
  phone: string;
  is_vip: boolean;
  is_blocked: boolean;
  last_visit_at: string | null;
  visitCount: number;
  totalSpent: number;
}

type Filter = "all" | "vip" | "blocked" | "stale30" | "stale60" | "vip_no_future";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "vip", label: "⭐ VIP" },
  { key: "blocked", label: "🚫 Bloqueadas" },
  { key: "stale30", label: "Sem visita +30d" },
  { key: "stale60", label: "Sem visita +60d" },
  { key: "vip_no_future", label: "VIPs s/ agend." },
];

function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return p;
}

function formatDate(iso: string | null): string {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function ClientesPage() {
  const router = useRouter();
  const [salonId, setSalonId] = useState<string | null>(null);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nova cliente state
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVip, setNewVip] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      supabase.from("salons").select("id").eq("owner_id", user.id).maybeSingle().then(({ data }) => {
        if (data) setSalonId(data.id as string);
        else setLoading(false);
      });
    });
  }, [router]);

  const loadClients = useCallback(async (sid: string, q: string, f: Filter) => {
    setLoading(true);
    const supabase = createClient();

    let query = supabase
      .from("clients")
      .select("id, name, phone, is_vip, is_blocked, last_visit_at")
      .eq("salon_id", sid)
      .order("name")
      .limit(100);

    if (q.trim()) {
      const term = q.trim();
      query = query.or(`name.ilike.%${term}%,phone.ilike.%${term.replace(/\D/g, "")}%`);
    }

    if (f === "vip" || f === "vip_no_future") query = query.eq("is_vip", true);
    if (f === "blocked") query = query.eq("is_blocked", true);
    if (f === "stale30") {
      const d30 = new Date(Date.now() - 30 * 86400_000).toISOString();
      query = query.or(`last_visit_at.lt.${d30},last_visit_at.is.null`);
    }
    if (f === "stale60") {
      const d60 = new Date(Date.now() - 60 * 86400_000).toISOString();
      query = query.or(`last_visit_at.lt.${d60},last_visit_at.is.null`);
    }

    const { data: rows } = await query;
    const base = (rows ?? []) as { id: string; name: string; phone: string; is_vip: boolean; is_blocked: boolean; last_visit_at: string | null }[];

    // Appointment stats in one batch query
    const ids = base.map(r => r.id);
    const statsMap: Record<string, { count: number; total: number }> = {};

    if (ids.length > 0) {
      const { data: appts } = await supabase
        .from("appointments")
        .select("client_id, total_price, status")
        .in("client_id", ids)
        .eq("status", "concluido");

      (appts ?? []).forEach((a: { client_id: string; total_price: number }) => {
        if (!statsMap[a.client_id]) statsMap[a.client_id] = { count: 0, total: 0 };
        statsMap[a.client_id].count++;
        statsMap[a.client_id].total += Number(a.total_price) || 0;
      });
    }

    let result: ClientRow[] = base.map(r => ({
      ...r,
      visitCount: statsMap[r.id]?.count ?? 0,
      totalSpent: statsMap[r.id]?.total ?? 0,
    }));

    // VIPs sem agendamento futuro: filter out those with future confirmed appts
    if (f === "vip_no_future" && ids.length > 0) {
      const { data: futureAppts } = await supabase
        .from("appointments")
        .select("client_id")
        .in("client_id", ids)
        .eq("status", "confirmado")
        .gte("appt_date", today);
      const withFuture = new Set((futureAppts ?? []).map((a: { client_id: string }) => a.client_id));
      result = result.filter(r => !withFuture.has(r.id));
    }

    setClients(result);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    if (!salonId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadClients(salonId, search, filter);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [salonId, search, filter, loadClients]);

  const handleCreate = async () => {
    if (!salonId) return;
    if (!newName.trim()) { setCreateErr("Nome obrigatório."); return; }
    if (!newPhone.replace(/\D/g, "")) { setCreateErr("Telefone obrigatório."); return; }
    setCreating(true);
    setCreateErr(null);
    const result = await addClient(salonId, { name: newName, phone: newPhone, isVip: newVip } as ClientInput);
    setCreating(false);
    if (result.ok) {
      setShowNew(false);
      setNewName(""); setNewPhone(""); setNewVip(false);
      loadClients(salonId, search, filter);
    } else {
      setCreateErr(result.error ?? "Erro ao criar cliente.");
    }
  };

  const field: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: "1.5px solid var(--border)", fontFamily: "var(--font-poppins)",
    fontSize: 13, color: "var(--text)", outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Users size={22} color="var(--gold)" />
          <h1 style={{ fontFamily: "var(--font-playfair)", fontSize: 28, fontWeight: 700, color: "var(--text)", margin: 0 }}>
            Clientes
          </h1>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 10, border: "none", background: "var(--gold)", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "white", fontFamily: "var(--font-poppins)", boxShadow: "0 4px 14px oklch(72% 0.115 75 / 0.3)" }}>
          <Plus size={15} /> Nova Cliente
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14 }}>
        <Search size={15} color="var(--text-light)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou telefone..."
          style={{ ...field, paddingLeft: 36 }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 14px", borderRadius: 20, border: `1.5px solid ${filter === f.key ? "var(--gold)" : "var(--border)"}`,
              background: filter === f.key ? "oklch(97% 0.04 75)" : "white",
              cursor: "pointer", fontSize: 12, fontWeight: filter === f.key ? 600 : 400,
              color: filter === f.key ? "var(--gold)" : "var(--text-mid)",
              fontFamily: "var(--font-poppins)",
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <p style={{ color: "var(--text-light)", fontFamily: "var(--font-poppins)", fontSize: 14, textAlign: "center", paddingTop: 40 }}>
          Carregando clientes...
        </p>
      ) : clients.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60 }}>
          <p style={{ fontSize: 40, marginBottom: 12 }}>👥</p>
          <p style={{ fontFamily: "var(--font-playfair)", fontSize: 20, color: "var(--text)", marginBottom: 8 }}>
            {search ? "Nenhuma cliente encontrada" : "Nenhuma cliente ainda"}
          </p>
          <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, color: "var(--text-light)" }}>
            {search ? "Tente outros termos de busca." : "Clientes são criadas automaticamente ao agendar, ou adicione manualmente."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {clients.map((c, i) => (
            <Link
              key={c.id}
              href={`/painel/clientes/${c.id}`}
              style={{
                display: "flex", alignItems: "center", padding: "14px 16px",
                background: "white", textDecoration: "none",
                borderRadius: i === 0 ? "12px 12px 0 0" : i === clients.length - 1 ? "0 0 12px 12px" : 0,
                border: "1px solid var(--border)",
                borderTop: i === 0 ? "1px solid var(--border)" : "none",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "oklch(98.5% 0.01 75)")}
              onMouseLeave={e => (e.currentTarget.style.background = "white")}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                background: c.is_blocked
                  ? "oklch(94% 0.03 15)"
                  : c.is_vip
                  ? "linear-gradient(135deg, oklch(88% 0.07 75), oklch(72% 0.115 75))"
                  : "linear-gradient(135deg, oklch(92% 0.03 10), oklch(85% 0.04 340))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, marginRight: 14,
              }}>
                {c.is_blocked ? "🚫" : c.is_vip ? "⭐" : "👤"}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontFamily: "var(--font-poppins)", fontSize: 14, fontWeight: 600, color: c.is_blocked ? "oklch(48% 0.14 15)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.name}
                  </span>
                  {c.is_vip && !c.is_blocked && (
                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", fontFamily: "var(--font-poppins)", background: "oklch(97% 0.04 75)", padding: "2px 8px", borderRadius: 10, border: "1px solid oklch(90% 0.05 75)" }}>VIP</span>
                  )}
                </div>
                <span style={{ fontFamily: "var(--font-poppins)", fontSize: 12, color: "var(--text-light)" }}>
                  {formatPhone(c.phone)} · {c.visitCount} {c.visitCount === 1 ? "visita" : "visitas"} · {fmt(c.totalSpent)}
                </span>
              </div>

              {/* Last visit */}
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                <span style={{ fontFamily: "var(--font-poppins)", fontSize: 11, color: "var(--text-light)" }}>última</span>
                <p style={{ fontFamily: "var(--font-poppins)", fontSize: 13, fontWeight: 600, color: "var(--text-mid)", margin: 0 }}>
                  {formatDate(c.last_visit_at)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal nova cliente */}
      {showNew && (
        <>
          <div onClick={() => setShowNew(false)} style={{ position: "fixed", inset: 0, background: "oklch(20% 0.03 340 / 0.5)", zIndex: 100, backdropFilter: "blur(2px)" }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 101, width: "min(440px, calc(100vw - 48px))", background: "white", borderRadius: 20, boxShadow: "0 20px 60px oklch(20% 0.04 340 / 0.25)", padding: "24px" }}>
            <h2 style={{ fontFamily: "var(--font-playfair)", fontSize: 22, color: "var(--text)", marginBottom: 20, margin: "0 0 20px" }}>Nova Cliente</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Nome *</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nome completo" style={field} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: "var(--text-mid)", fontFamily: "var(--font-poppins)", display: "block", marginBottom: 5 }}>Telefone *</label>
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="(11) 99999-0000" style={field} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 20 }}>
              <input type="checkbox" checked={newVip} onChange={e => setNewVip(e.target.checked)} style={{ accentColor: "var(--gold)" }} />
              <span style={{ fontSize: 13, fontFamily: "var(--font-poppins)", color: "var(--text)" }}>⭐ Marcar como VIP</span>
            </label>
            {createErr && (
              <p style={{ fontSize: 12, color: "oklch(48% 0.14 15)", fontFamily: "var(--font-poppins)", marginBottom: 12, padding: "8px 12px", background: "oklch(97% 0.03 15)", borderRadius: 8 }}>
                {createErr}
              </p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1.5px solid var(--border)", background: "white", cursor: "pointer", fontSize: 13, color: "var(--text-mid)", fontFamily: "var(--font-poppins)" }}>
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={creating} style={{ flex: 2, padding: 10, borderRadius: 10, border: "none", background: "var(--gold)", cursor: creating ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "white", fontFamily: "var(--font-poppins)" }}>
                {creating ? "Criando..." : "Criar cliente"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
