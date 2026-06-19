import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface Stage {
  key: string;
  label: string;
  count: number;
  href: string;
  /** Tailwind bg + text classes when active */
  activeCls: string;
  /** Tailwind text class for the count when active */
  countCls: string;
  /** Optional lucide icon shown above the count */
  icon?: LucideIcon;
}

interface Props {
  stages: readonly Stage[];
  activeKey: string;
  /** Additional wrapper class */
  className?: string;
}

export function StagePipeline({ stages, activeKey, className = "" }: Props) {
  return (
    <nav
      aria-label="Etapas del flujo"
      className={`flex items-stretch gap-0 overflow-x-auto [scrollbar-width:none] ${className}`}
    >
      <ol className="flex items-center gap-0 min-w-max">
        {stages.map((stage, i) => {
          const isActive = stage.key === activeKey;
          const Icon = stage.icon;
          return (
            <li key={stage.key} className="flex items-center">
              <Link
                href={stage.href}
                aria-current={isActive ? "step" : undefined}
                className={`
                  group flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl
                  min-w-[88px] text-center transition-all duration-150
                  ${isActive
                    ? `${stage.activeCls} ring-1 ring-inset ring-white/10 shadow-lg`
                    : "text-slate-600 hover:text-slate-300 hover:bg-slate-800/60"
                  }
                `}
              >
                <div className="flex items-center gap-1.5">
                  {Icon && (
                    <Icon
                      className={`w-3.5 h-3.5 transition-colors ${
                        isActive ? stage.countCls : "text-slate-700 group-hover:text-slate-500"
                      }`}
                      strokeWidth={2.2}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`text-2xl font-black tabular-nums leading-none transition-colors ${
                      isActive ? stage.countCls : "text-slate-700"
                    }`}
                  >
                    {stage.count}
                  </span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-widest leading-none">
                  {stage.label}
                </span>
              </Link>

              {i < stages.length - 1 && (
                <span
                  className={`text-sm px-1 select-none transition-colors ${
                    isActive ? "text-slate-600" : "text-slate-800"
                  }`}
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
