import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@sistema-clinica/db";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const settings = await prisma.clinicSettings.findFirst();

  return (
    <div className="flex min-h-screen">
      <Sidebar clinicName={settings?.name ?? "Panel de la clínica"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-border bg-surface px-6 py-3">
          <SignOutButton userEmail={session.user?.email ?? ""} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
