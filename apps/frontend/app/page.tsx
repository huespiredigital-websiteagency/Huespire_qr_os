import Link from "next/link";

export default function HomePage() {
  const domain = process.env.NEXT_PUBLIC_DOMAIN || "localhost:3000";
  const protocol = domain.includes("localhost") ? "http" : "https";
  const demoUrl = `${protocol}://pizza.${domain}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-4xl text-center space-y-8">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
          Welcome to <span className="text-indigo-600">Restaurant OS</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          The ultimate multi-tenant platform for managing tables, generating QR codes, accepting digital orders, and coordinating kitchen workflows.
        </p>

        <div className="flex justify-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-indigo-600 px-6 py-3 text-lg font-semibold text-white shadow-md hover:bg-indigo-700 transition"
          >
            Staff Dashboard Login
          </Link>
          <a
            href={demoUrl}
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-lg font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Demo Restaurant Subdomain
          </a>
        </div>
      </div>
    </main>
  );
}
