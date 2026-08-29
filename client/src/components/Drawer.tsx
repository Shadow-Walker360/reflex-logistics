import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Drawer({ isOpen, onClose, title, children }: DrawerProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close panel"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-graphite-950/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative flex h-full w-full max-w-md animate-rise-in flex-col overflow-y-auto border-l border-border bg-surface shadow-pearl-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="drawer-title" className="text-card-title text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="rounded p-1 text-muted hover:bg-graphite-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
