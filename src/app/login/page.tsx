"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginPage() {

  const router = useRouter();

  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [message,setMessage] = useState("");
  

  async function handleLogin(){

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  console.log("LOGIN DATA:", data);
  console.log("LOGIN ERROR:", error);


  if(error){
    setMessage(error.message);
    return;
  }

  router.push("/dashboard");
  router.refresh();

}


  return (
    <main className="min-h-screen flex items-center justify-center">

      <div className="w-full max-w-md">

        <h1 className="text-3xl font-bold mb-6">
          Teacher Login
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
          className="bg-black text-white p-3 w-full"
          onClick={handleLogin}
        >
          Login
        </button>


        <p className="mt-4">
          {message}
        </p>


      </div>

    </main>
  );
}