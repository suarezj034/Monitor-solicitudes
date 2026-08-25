"use client";

import { useEffect, useRef, useState } from "react";

export interface UserMenuAction {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/** Botón de cuenta con menú desplegable (para agrupar acciones secundarias del header). */
export function UserMenu({ actions, label = "Cuenta" }: { actions: UserMenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        aria-expanded={open}
      >
        <span aria-hidden="true">👤</span>
        <span className="hidden sm:inline">{label}</span>
        <span className={`text-xs transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className={`block w-full px-3.5 py-2 text-left text-sm transition hover:bg-slate-50 ${
                a.danger ? "text-rose-600" : "text-slate-700"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
