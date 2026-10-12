import { cn } from "@/lib/utils";

export function StarMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-7", className)}>
      <path d="M12 1.5l2.6 7.1 7.4.5-5.8 4.7 1.9 7.3L12 17l-6.1 4.1 1.9-7.3L2 9.1l7.4-.5z" fill="currentColor" />
    </svg>
  );
}

export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("text-[13px] font-bold tracking-[0.12em] text-gold-text uppercase", className)}>
      {children}
    </span>
  );
}
