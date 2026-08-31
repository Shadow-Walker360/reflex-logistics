import type { HTMLAttributes } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "premium";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-graphite-100 text-graphite-700",
  info: "bg-info/10 text-teal-700",
  success: "bg-success/10 text-olive-700",
  warning: "bg-warning/10 text-amber-700",
  danger: "bg-danger/10 text-crimson-700",
  premium: "bg-premium/10 text-wine-700",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
