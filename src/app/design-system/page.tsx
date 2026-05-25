"use client";

import { useState } from "react";
import { Button, Card, Input, Textarea, Select, Badge, Modal, PageHeader } from "@/components/ui";

const palette = [
  { name: "onyx",   hex: "#0A0A0A" },
  { name: "cream",  hex: "#F6F2EC" },
  { name: "sand",   hex: "#ECE6DC" },
  { name: "silver", hex: "#C9C4BC" },
  { name: "blush",  hex: "#B89A8F" },
];

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputVal, setInputVal] = useState("");

  return (
    <div className="brand-root min-h-screen py-16 px-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-16">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <span className="italic-accent text-blush text-lg">Lev Beauty</span>
          <h1 className="font-display text-4xl font-semibold text-onyx">Design System</h1>
          <p className="font-sans text-silver text-sm">Fase 1 — Foundation + componentes base</p>
        </div>

        {/* ── Palette ─────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">Paleta</h2>
          <div className="grid grid-cols-5 gap-3">
            {palette.map(({ name, hex }) => (
              <div key={name} className="flex flex-col gap-2">
                <div
                  className="h-16 rounded-xl border border-silver/20"
                  style={{ background: hex }}
                />
                <div>
                  <p className="font-sans text-xs font-medium text-onyx">{name}</p>
                  <p className="font-sans text-xs text-silver">{hex}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Typography ──────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">Tipografia</h2>
          <Card>
            <div className="flex flex-col gap-5">
              <div>
                <p className="font-sans text-xs text-silver mb-1">Display / Playfair Display</p>
                <h3 className="font-display text-3xl font-semibold text-onyx">Beleza com elegância</h3>
              </div>
              <div>
                <p className="font-sans text-xs text-silver mb-1">Sans / Inter — body</p>
                <p className="font-sans text-base text-onyx">Texto corrido, labels, botões e inputs. Legível e neutro.</p>
              </div>
              <div>
                <p className="font-sans text-xs text-silver mb-1">Italic accent / Cormorant Garamond</p>
                <p className="italic-accent text-xl text-blush">Instante de cuidado</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-sans text-xs text-silver mb-1">Escala Sans</p>
                <p className="font-sans text-xs text-onyx">text-xs — 12px</p>
                <p className="font-sans text-sm text-onyx">text-sm — 14px</p>
                <p className="font-sans text-base text-onyx">text-base — 16px</p>
                <p className="font-sans text-lg text-onyx">text-lg — 18px</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ── Button ──────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">Button</h2>
          <Card>
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="primary" disabled>Disabled</Button>
                <Button variant="primary" loading>Loading</Button>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
          </Card>
        </section>

        {/* ── Card ────────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">Card</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <p className="font-sans text-sm text-onyx font-medium mb-1">Default</p>
              <p className="font-sans text-xs text-silver">bg-sand, borda silver/20, sem sombra.</p>
            </Card>
            <Card variant="elevated">
              <p className="font-sans text-sm text-onyx font-medium mb-1">Elevated</p>
              <p className="font-sans text-xs text-silver">Mesma base + shadow sutil.</p>
            </Card>
          </div>
        </section>

        {/* ── Badge ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">Badge</h2>
          <Card>
            <div className="flex flex-wrap gap-3">
              <Badge variant="default">Blush</Badge>
              <Badge variant="success">Concluído</Badge>
              <Badge variant="warning">Pendente</Badge>
              <Badge variant="info">Em andamento</Badge>
              <Badge variant="neutral">Neutro</Badge>
            </div>
          </Card>
        </section>

        {/* ── Form fields ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">Form fields</h2>
          <Card>
            <div className="flex flex-col gap-5">
              <Input
                label="Input — default"
                placeholder="Escreva algo..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
              />
              <Input
                label="Input — com helper"
                placeholder="seu@email.com"
                helper="Nunca compartilharemos seu e-mail."
              />
              <Input
                label="Input — com erro"
                placeholder="Nome completo"
                error="Campo obrigatório"
              />
              <Textarea
                label="Textarea"
                placeholder="Observações adicionais..."
                helper="Máximo 500 caracteres."
              />
              <Select label="Select" placeholder="Escolha uma opção...">
                <option value="a">Opção A</option>
                <option value="b">Opção B</option>
                <option value="c">Opção C</option>
              </Select>
              <Select label="Select — com erro" error="Selecione uma opção" placeholder="Escolha...">
                <option value="a">Opção A</option>
              </Select>
            </div>
          </Card>
        </section>

        {/* ── PageHeader ──────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">PageHeader</h2>
          <Card>
            <PageHeader
              title="Clientes"
              subtitle="Gerencie sua base de clientes e fichas de anamnese."
              action={<Button size="sm">+ Nova cliente</Button>}
            />
          </Card>
          <Card>
            <PageHeader
              title="Agenda"
              subtitle="Visualize e gerencie seus agendamentos."
            />
          </Card>
        </section>

        {/* ── Modal ───────────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-onyx">Modal</h2>
          <Card>
            <Button onClick={() => setModalOpen(true)}>Abrir modal</Button>
          </Card>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirmar ação"
          >
            <p className="font-sans text-sm text-onyx mb-6">
              Esta é uma caixa de diálogo com backdrop blur, animação slide-up e fechamento via Esc ou clique fora.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={() => setModalOpen(false)}>Confirmar</Button>
            </div>
          </Modal>
        </section>

      </div>
    </div>
  );
}
