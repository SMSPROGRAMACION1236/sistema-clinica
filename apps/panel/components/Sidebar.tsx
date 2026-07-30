"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Stethoscope,
  Users,
  MessagesSquare,
  MessageCircle,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/turnos", label: "Turnos", icon: CalendarCheck },
  { href: "/profesionales", label: "Profesionales", icon: Stethoscope },
  { href: "/pacientes", label: "Pacientes", icon: Users },
  { href: "/seguimientos", label: "Seguimientos", icon: MessagesSquare },
  { href: "/conversaciones", label: "Conversaciones", icon: MessageCircle },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export function Sidebar({ clinicName }: { clinicName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-5">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-wash text-accent">
          <Stethoscope className="h-[18px] w-[18px]" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-primary">{clinicName}</p>
          <p className="text-xs text-ink-muted">Panel de gestión</p>
        </div>
      </div>

      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-accent-wash font-medium text-accent"
                  : "text-ink-secondary hover:bg-accent-wash/50 hover:text-ink-primary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
