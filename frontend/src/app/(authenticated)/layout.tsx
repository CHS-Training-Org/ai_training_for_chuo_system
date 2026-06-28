import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProfileAction } from "@/server/actions/auth";
import { signOutAction } from "@/server/actions/auth";
import { Header } from "@/components/layout/Header";
import { SideNav } from "@/components/layout/SideNav";
import type { Role } from "@/lib/types";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/auth/signin");
  }

  let profile: Awaited<ReturnType<typeof getProfileAction>> | null = null;
  try {
    profile = await getProfileAction();
  } catch {
    redirect("/auth/signin");
  }

  return (
    <div className="flex h-screen flex-col">
      <Header userName={profile.name} role={profile.role as Role} onSignOut={signOutAction} />
      <div className="flex flex-1 overflow-hidden">
        <SideNav role={profile.role as Role} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
