import { BottomNav } from "@/components/client/BottomNav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "oklch(96% 0.015 75)", display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 430, minHeight: "100vh", background: "white", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
          {children}
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
