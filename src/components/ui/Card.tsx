import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "elevated";
}

export function Card({ children, className, variant = "default" }: CardProps) {
  return (
    <div
      className={cn(
        "bg-sand rounded-xl p-6 border border-silver/20",
        variant === "elevated" && "shadow-[0_4px_24px_0_rgba(10,10,10,0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
