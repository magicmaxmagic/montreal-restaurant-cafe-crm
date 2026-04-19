import { clsx } from "clsx";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-white/10 bg-white/[0.055] shadow-glow backdrop-blur-xl",
        className
      )}
      {...props}
    />
  );
}

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function PrimaryButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Button
      className={clsx(
        "border-accent-400/40 bg-accent-500 text-white hover:bg-accent-600",
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-white outline-none ring-accent-400/30 placeholder:text-slate-500 focus:border-accent-400/60 focus:ring-4",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-white outline-none ring-accent-400/30 focus:border-accent-400/60 focus:ring-4",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-xl border border-white/10 bg-ink-900/80 px-3 py-2 text-sm text-white outline-none ring-accent-400/30 placeholder:text-slate-500 focus:border-accent-400/60 focus:ring-4",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200",
        className
      )}
      {...props}
    />
  );
}
