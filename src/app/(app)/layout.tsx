import { redirect } from "next/navigation";
import { getSession } from "~/server/better-auth/server";
import { Sidebar } from "./_components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-grey-950">
      <Sidebar
        user={{
          name: session.user.name,
          email: session.user.email,
        }}
      />
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
