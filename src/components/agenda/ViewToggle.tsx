"use client";

interface Option {
  key: string;
  label: string;
}

interface ViewToggleProps {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
}

export function ViewToggle({ options, value, onChange }: ViewToggleProps) {
  return (
    <div style={{ display: "flex", gap: 3, background: "oklch(96% 0.015 75)", borderRadius: 10, padding: 4 }}>
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          style={{
            padding: "6px 14px",
            borderRadius: 7,
            border: "none",
            background: value === o.key ? "white" : "transparent",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: value === o.key ? 700 : 500,
            color: value === o.key ? "var(--text)" : "var(--text-mid)",
            fontFamily: "var(--font-poppins)",
            boxShadow: value === o.key ? "0 1px 4px oklch(40% 0.04 340 / 0.12)" : "none",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
