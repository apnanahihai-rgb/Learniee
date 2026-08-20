import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold">Learnie</h1>
      <p className="text-gray-600">Welcome — please sign in or create an account.</p>

      <div className="flex gap-4 mt-4">
        <Link
          href="/login"
          className="bg-violet-600 text-white px-6 py-2 rounded"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="border border-violet-600 text-violet-600 px-6 py-2 rounded"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}