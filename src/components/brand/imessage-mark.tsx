import { cn } from "@/lib/utils";

export function IMessageMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("shrink-0", className)}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" fill="#30D158" r="10" />
      <path
        d="M12 6.65c-3.34 0-6.05 2.23-6.05 4.98 0 1.58.9 2.98 2.3 3.89-.12.72-.51 1.57-1.16 2.15 1.29.06 2.45-.36 3.2-1.06.55.14 1.12.21 1.71.21 3.34 0 6.05-2.22 6.05-4.97S15.34 6.65 12 6.65Z"
        fill="white"
      />
    </svg>
  );
}
