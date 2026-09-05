"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password || !confirmPassword) {
      setMessage("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match. Please check and try again.");
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Account created successfully! Please check your email inbox for the confirmation link.");
        setTimeout(() => {
          router.push("/login");
        }, 4000);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      setMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-pink-100 shadow-sm space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-pink-950">
            Create Teacher Account
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Enter your details to register your private teaching platform.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700">Email Address *</label>
            <input
              type="email"
              required
              className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500"
              placeholder="teacher@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700">Password *</label>
            <input
              type="password"
              required
              className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700">Confirm Password *</label>
            <input
              type="password"
              required
              className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold p-3 w-full rounded-xl text-xs transition cursor-pointer disabled:opacity-50 mt-2"
          >
            {isSubmitting ? "Creating Account & Sending Email..." : "Sign Up"}
          </button>
        </form>

        {message && (
          <p className={`text-xs text-center font-medium p-3 rounded-xl ${message.includes("success") ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-pink-50 text-pink-700 border border-pink-200"}`}>
            {message}
          </p>
        )}

        <div className="text-center pt-2">
          <p className="text-xs text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-pink-600 font-bold hover:underline">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}