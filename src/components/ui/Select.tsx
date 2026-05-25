import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  error?: string;
  placeholder?: string;
}

export function Select({ label, helper, error, placeholder, className, id, children, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="font-sans font-medium text-sm text-onyx leading-none"
        >
          {label}
        </label>
      )}
      <div className="relative w-full">
        <select
          id={inputId}
          className={cn(
            "w-full px-3.5 py-2.5 rounded-lg border border-silver bg-transparent appearance-none",
            "font-sans text-sm text-onyx",
            "transition-colors duration-150 outline-none cursor-pointer",
            "focus:border-onyx focus:ring-1 focus:ring-onyx/20",
            error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {/* Chevron icon */}
        <span
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-silver"
          aria-hidden
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {(error ?? helper) && (
        <p className={cn("text-xs font-sans", error ? "text-red-500" : "text-silver")}>
          {error ?? helper}
        </p>
      )}
    </div>
  );
}
