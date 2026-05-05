import { Sidebar } from "@/components/owner/Sidebar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", background: "oklch(97% 0.012 75)", overflow: "hidden" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {children}
      </main>
    </div>
  );
}
