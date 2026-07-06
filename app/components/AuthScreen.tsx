import type { FormEvent } from "react";

type AuthScreenProps = {
  authMode: "signin" | "signup";
  authError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onModeToggle: () => void;
};

export function AuthScreen({ authMode, authError, onSubmit, onModeToggle }: AuthScreenProps) {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand">Streamline</div>
        <h1>Unlimited short-form shows, movies, and collections.</h1>
        <p>
          Sign in to browse the storefront, keep your watchlist, and continue from cached titles when the network drops.
        </p>
        <form onSubmit={onSubmit} className="auth-form">
          {authMode === "signup" && (
            <label>
              Name
              <input name="name" autoComplete="name" placeholder="Alex Morgan" />
            </label>
          )}
          <label>
            Email
            <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              placeholder="Minimum 6 characters"
            />
          </label>
          {authError && <span className="form-error">{authError}</span>}
          <button type="submit">{authMode === "signup" ? "Create account" : "Sign in"}</button>
        </form>
        <button className="text-button" onClick={onModeToggle}>
          {authMode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </section>
    </main>
  );
}
