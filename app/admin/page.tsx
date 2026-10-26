"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

const ADMIN_PIN = "2026";
const FORMS = {
  inventory:
    process.env.NEXT_PUBLIC_INVENTORY_FORM_URL ||
    process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ||
    "https://docs.google.com/forms/d/e/1FAIpQLSdEjNM_RD50CFl_vhVlLBBFuDvpe_u4bQkb4OU9WN0RJqXpvA/viewform?embedded=true",
  sales:
    process.env.NEXT_PUBLIC_SALES_FORM_URL ||
    "https://docs.google.com/forms/d/e/1FAIpQLScthU3XIgXaKesAVoBImkSiTkZhFzKyRXe_jiswx_9q9wbniA/viewform?embedded=true",
} as const;

type FormName = keyof typeof FORMS;

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");
  const [selectedForm, setSelectedForm] = useState<FormName | null>(null);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin !== ADMIN_PIN) {
      setError("Incorrect PIN. Please try again.");
      return;
    }
    setError("");
    setAuthenticated(true);
  }

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-rose-700">
              Payal Collection
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
          </div>
          <Link
            href="/"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-stone-700 ring-1 ring-stone-300 hover:bg-white"
          >
            View catalog
          </Link>
        </header>

        {!authenticated ? (
          <section className="mx-auto max-w-sm rounded-xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <h2 className="text-xl font-semibold">Admin login</h2>
            <p className="mt-2 text-sm text-stone-600">Enter the admin PIN to continue.</p>
            <form onSubmit={handleLogin} className="mt-5 space-y-4">
              <label htmlFor="admin-pin" className="block text-sm font-medium">
                PIN
              </label>
              <input
                id="admin-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value);
                  setError("");
                }}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-rose-700 focus:ring-2 focus:ring-rose-200"
                required
                autoFocus
              />
              {error && (
                <p role="alert" className="text-sm text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="w-full rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800"
              >
                Continue
              </button>
            </form>
          </section>
        ) : (
          <section>
            <h2 className="text-xl font-semibold">Choose a form</h2>
            <p className="mt-2 text-stone-600">
              Select an inventory or sales form to fill it in here.
            </p>
            <div className="mt-5 flex flex-wrap gap-3" aria-label="Admin forms">
              <button
                type="button"
                onClick={() => setSelectedForm("inventory")}
                aria-pressed={selectedForm === "inventory"}
                className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${
                  selectedForm === "inventory"
                    ? "bg-rose-800 text-white"
                    : "bg-rose-700 text-white hover:bg-rose-800"
                }`}
              >
                Inventory Form
              </button>
              <button
                type="button"
                onClick={() => setSelectedForm("sales")}
                aria-pressed={selectedForm === "sales"}
                className={`rounded-lg px-5 py-3 text-sm font-semibold transition ${
                  selectedForm === "sales"
                    ? "bg-rose-800 text-white"
                    : "bg-rose-700 text-white hover:bg-rose-800"
                }`}
              >
                Sales Form
              </button>
            </div>
            {selectedForm ? (
              <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200">
                <iframe
                  key={selectedForm}
                  title={selectedForm === "inventory" ? "Inventory form" : "Sales form"}
                  src={FORMS[selectedForm]}
                  className="h-[75vh] min-h-[640px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : (
              <p className="mt-6 rounded-lg bg-white p-5 text-sm text-stone-600 ring-1 ring-stone-200">
                Choose a form above to begin.
              </p>
            )}
            <p className="mt-4 text-xs text-stone-500">
              The admin PIN is a convenience gate only, not secure authentication. Keep the
              underlying Google Forms restricted to trusted staff.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
