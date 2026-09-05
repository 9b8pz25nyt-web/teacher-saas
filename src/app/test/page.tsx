import { createClient } from "@/lib/supabase-server";

export default async function TestPage() {

  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();


  return (
    <main className="p-10">

      <h1 className="text-3xl font-bold">
        Supabase Test
      </h1>

      <pre className="mt-4">
        {JSON.stringify(session, null, 2)}
      </pre>

    </main>
  );
}