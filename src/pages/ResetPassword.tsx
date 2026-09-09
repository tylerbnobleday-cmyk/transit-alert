import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole } from "lucide-react";
import { resetPassword } from "@/lib/auth";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const resetMutation = useMutation({
    mutationFn: (password: string) => resetPassword(token, password),
    onSuccess: async (session) => {
      queryClient.setQueryData(["auth-session"], session);
      await queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      setLocation("/app");
    },
  });

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-8 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)]" />

      <section className="relative w-full max-w-md rounded-[1.7rem] border border-white/10 bg-slate-950/85 p-6 shadow-2xl backdrop-blur-2xl sm:rounded-[2rem] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80">TransitAlert</p>
        <h1 className="mt-3 flex items-center gap-2 text-2xl font-semibold text-white">
          <LockKeyhole className="h-5 w-5 text-blue-300" />
          Set a new password
        </h1>

        {!token ? (
          <p className="mt-4 rounded-[1.15rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:rounded-2xl">
            This link is missing its reset token. Request a new password reset link from the sign-in page.
          </p>
        ) : resetMutation.isSuccess ? (
          <p className="mt-4 rounded-[1.15rem] border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 sm:rounded-2xl">
            Password updated — taking you back into TransitAlert.
          </p>
        ) : (
          <form
            className="mt-6 space-y-3.5"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError("");
              if (newPassword !== confirmPassword) {
                setFormError("The new passwords do not match.");
                return;
              }
              resetMutation.mutate(newPassword);
            }}
          >
            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-blue-400/60 sm:rounded-2xl sm:py-3"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.18em] text-white/45">Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                minLength={10}
                className="w-full rounded-[1.15rem] border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none transition focus:border-blue-400/60 sm:rounded-2xl sm:py-3"
              />
            </label>

            <p className="text-xs leading-5 text-white/50">Use at least 10 characters with at least one letter and one number.</p>

            {(formError || resetMutation.error instanceof Error) && (
              <div className="rounded-[1.15rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:rounded-2xl">
                {formError || (resetMutation.error as Error).message}
              </div>
            )}

            <button
              type="submit"
              disabled={resetMutation.isPending}
              className="w-full rounded-[1.15rem] bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-70 sm:rounded-2xl sm:py-3"
            >
              {resetMutation.isPending ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
