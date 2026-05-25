import { Sidebar } from "@/components/owner/Sidebar";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
