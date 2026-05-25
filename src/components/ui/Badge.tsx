import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "warning" | "success" | "info" | "neutral";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-blush/15 text-blush",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  info:    "bg-sky-100 text-sky-700",
  neutral: "bg-silver/20 text-onyx/60",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full",
        "font-sans font-medium text-xs leading-none",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
