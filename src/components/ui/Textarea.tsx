import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export function Textarea({ label, helper, error, className, id, ...props }: TextareaProps) {
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
      <textarea
        id={inputId}
        className={cn(
          "w-full px-3.5 py-2.5 rounded-lg border border-silver bg-transparent",
          "font-sans text-sm text-onyx placeholder:text-silver",
          "transition-colors duration-150 outline-none resize-vertical",
          "focus:border-onyx focus:ring-1 focus:ring-onyx/20",
          "min-h-[100px]",
          error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
          className,
        )}
        {...props}
      />
      {(error ?? helper) && (
        <p className={cn("text-xs font-sans", error ? "text-red-500" : "text-silver")}>
          {error ?? helper}
        </p>
      )}
    </div>
  );
}
