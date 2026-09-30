import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "secondary", size = "md", className = "", children, ...rest }: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-sm",
  };
  const variants = {
    primary:
      "bg-gradient-to-r from-primary to-violet-deep text-white shadow-[0_0_0_1px_rgba(99,102,241,0.35),0_8px_24px_-8px_rgba(99,102,241,0.5)] hover:shadow-[0_0_0_1px_rgba(99,102,241,0.5),0_8px_32px_-6px_rgba(139,92,246,0.55)]",
    secondary:
      "border border-line-strong bg-elevated text-ink hover:bg-hover hover:border-line",
    ghost: "text-muted hover:text-ink hover:bg-hover",
    danger:
      "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
  };
  return (
    <motion.button
      whileHover={rest.disabled ? undefined : { scale: 1.01 }}
      whileTap={rest.disabled ? undefined : { scale: 0.98 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
