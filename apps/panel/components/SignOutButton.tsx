"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton({ userEmail }: { userEmail: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-ink-secondary transition-colors hover:bg-accent-wash/50 hover:text-ink-primary"
      title={userEmail}
    >
      <LogOut className="h-4 w-4" strokeWidth={2.25} />
      <span className="max-w-[10rem] truncate">{userEmail}</span>
    </button>
  );
}
