"use client";

import { useState } from "react";
import { supabase } from "@/app/lib/supabase";

export default function SignupPage() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSignup() {

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Account created! Check your email.");
    }

  }

  return (
    <main className="min-h-screen flex items-center justify-center">

      <div className="w-full max-w-md">

        <h1 className="text-3xl font-bold mb-6">
          Create Teacher Account
        </h1>

        <input
          className="border p-3 w-full mb-3"
          placeholder="Email"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          className="border p-3 w-full mb-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        <button
          onClick={handleSignup}
          className="bg-black text-white p-3 w-full"
        >
          Sign Up
        </button>

        <p className="mt-4">
          {message}
        </p>

      </div>

    </main>
  );
}