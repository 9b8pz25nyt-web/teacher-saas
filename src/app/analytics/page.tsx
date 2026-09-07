"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, DollarSign, Clock, Users, BookOpen } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    async function fetchAnalyticsData() {
      try {
        const [{ data: studentData }, { data: reportData }] = await Promise.all([
          supabase.from("students").select("*"),
          supabase.from("class_reports").select("*"),
        ]);

        if (studentData) setStudents(studentData);
        if (reportData) setReports(reportData);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-pink-600 font-medium">Loading analytics...</div>;
  }

  const activeStudents = students.filter((s) => s.payment_status === "Active").length;
  
  const totalIncomePHP = students.reduce((sum, s) => {
    return sum + (Number(s.php_equivalent) || Number(s.payment_amount) || 0);
  }, 0);

  const totalCompletedClasses = students.reduce((sum, s) => {
    return sum + (Number(s.classes_completed) || 0);
  }, 0);

  const totalTeachingMinutes = students.reduce((sum, s) => {
    const completed = Number(s.classes_completed) || 0;
    const duration = Number(s.class_duration) || 40;
    return sum + completed * duration;
  }, 0);

  const totalTeachingHours = (totalTeachingMinutes / 60).toFixed(1);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/students"
          className="text-xs font-semibold text-pink-600 hover:text-pink-700 flex items-center gap-1.5 transition"
        >
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
        <h1 className="text-xl font-extrabold text-pink-950">Analytics & Earnings 📊</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-pink-600">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue (PHP Value)</span>
            <DollarSign size={20} />
          </div>
          <p className="text-3xl font-black text-pink-950">₱{totalIncomePHP.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Sum across all registered student packages</p>
        </div>

        <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-pink-600">
            <span className="text-xs font-bold uppercase tracking-wider">Teaching Hours</span>
            <Clock size={20} />
          </div>
          <p className="text-3xl font-black text-pink-950">{totalTeachingHours} hrs</p>
          <p className="text-xs text-gray-400">{totalCompletedClasses} total completed classes logged</p>
        </div>

        <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-pink-600">
            <span className="text-xs font-bold uppercase tracking-wider">Active Students</span>
            <Users size={20} />
          </div>
          <p className="text-3xl font-black text-pink-950">{activeStudents}</p>
          <p className="text-xs text-gray-400">Out of {students.length} total enrolled students</p>
        </div>
      </div>

      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Recent Lesson Activity Overview</h3>
        <p className="text-xs text-gray-500">
          Total lesson reports recorded in system: <span className="font-bold text-pink-600">{reports.length}</span>
        </p>
      </div>
    </div>
  );
}