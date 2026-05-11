import { redirect } from "next/navigation";
import { SignInButton } from "~/app/_components/auth-buttons";
import { getSession } from "~/server/better-auth/server";

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-grey-950">
      <div className="flex w-full max-w-sm flex-col items-center gap-8 rounded-2xl border border-dusty-lavender-800 bg-slate-grey-900 p-10">
        <div className="flex flex-col items-center gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-grey-50">
            Fintrack
          </span>
          <span className="text-sm text-dusty-lavender-400">
            Your personal finance dashboard
          </span>
        </div>

        <SignInButton />
      </div>
    </main>
  );
}
