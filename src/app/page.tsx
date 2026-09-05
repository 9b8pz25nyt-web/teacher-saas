import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-4xl font-extrabold text-pink-950">Teacher SaaS</h1>
        <p className="text-gray-500 text-sm">
          Private teaching management platform for schedules, students, and curriculum.
        </p>
        <div className="flex justify-center">
          <Link
            href="/login"
            className="px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-2xl transition text-sm shadow-sm"
          >
            Teacher Portal Login
          </Link>
        </div>
      </div>
    </div>
  );
}