"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push("/students");
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white border border-pink-100 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold text-pink-950">Teacher Login</h1>
          <p className="text-xs text-gray-500">
            Sign in to access your students, schedules, and curriculum.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="teacher@example.com"
              className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700">
              Password *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs text-center font-medium p-3 bg-pink-50 text-pink-700 border border-pink-200 rounded-xl">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold p-3 rounded-xl text-xs transition cursor-pointer disabled:opacity-50 shadow-xs"
          >
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/"
            className="text-xs text-pink-600 hover:text-pink-700 font-bold transition"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}