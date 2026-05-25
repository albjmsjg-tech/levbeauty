import { Sidebar } from "@/components/owner/Sidebar";
import { MobileNav } from "@/components/owner/MobileNav";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-cream overflow-hidden">
      {/* Desktop sidebar — hidden below lg */}
      <Sidebar />

      {/* Right column: mobile header + main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header + drawer — hidden on lg+ */}
        <MobileNav />

        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
