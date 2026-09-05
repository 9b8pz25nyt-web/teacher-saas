"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { convertToPHP } from "@/lib/currency";
import { countries } from "@/constants/countries";
import { currencies } from "@/constants/currencies";

const DEFAULT_ALIASES = ["Teacher Gabi", "Teacher Princess"];

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [teacherAliases, setTeacherAliases] = useState<string[]>(DEFAULT_ALIASES);

  // Form State
  const [name, setName] = useState("");
  const [teacherAlias, setTeacherAlias] = useState("Teacher Gabi");
  const [meetingLink, setMeetingLink] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [country, setCountry] = useState("");
  const [paymentType, setPaymentType] = useState("Monthly");
  const [paymentCurrency, setPaymentCurrency] = useState("PHP");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [phpEquivalent, setPhpEquivalent] = useState("");
  const [classesIncluded, setClassesIncluded] = useState("30");
  const [classesCompleted, setClassesCompleted] = useState("0");
  const [classDuration, setClassDuration] = useState("40");
  const [customDuration, setCustomDuration] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Active");
  const [notes, setNotes] = useState("");

  async function calculatePHP(amount: string, currency: string) {
    const cleanAmount = amount.replace(/,/g, "");
    const numberAmount = Number(cleanAmount);

    if (!numberAmount || isNaN(numberAmount)) {
      setPhpEquivalent("");
      return;
    }

    try {
      const php = await convertToPHP(numberAmount, currency);
      setPhpEquivalent(Math.round(php).toLocaleString());
    } catch (error) {
      console.error("Currency conversion failed:", error);
      setPhpEquivalent("");
    }
  }

  function resetForm() {
    setName("");
    setTeacherAlias(teacherAliases[0] || "Teacher Gabi");
    setMeetingLink("");
    setEmail("");
    setPhone("");
    setAge("");
    setCountry("");
    setPaymentType("Monthly");
    setPaymentCurrency("PHP");
    setPaymentAmount("");
    setPhpEquivalent("");
    setClassesIncluded("30");
    setClassesCompleted("0");
    setClassDuration("40");
    setCustomDuration("");
    setPaymentStatus("Active");
    setNotes("");
  }

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    // Fetch Teacher Profile Aliases
    const { data: profile } = await supabase
      .from("profiles")
      .select("teacher_aliases")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.teacher_aliases && profile.teacher_aliases.length > 0) {
      setTeacherAliases(profile.teacher_aliases);
      setTeacherAlias(profile.teacher_aliases[0]);
    }

    // Fetch Students
    const { data: studentList, error } = await supabase
      .from("students")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && studentList) {
      setStudents(studentList);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addStudent() {
    if (!name || !country || !paymentAmount) {
      alert("Please complete student name, country, and payment amount.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const duration = classDuration === "" ? customDuration : classDuration;

    const { error } = await supabase.from("students").insert({
      teacher_id: user.id,
      name,
      teacher_alias: teacherAlias || "Teacher Gabi",
      meeting_link: meetingLink.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      age: age ? Number(age) : null,
      country,
      payment_type: paymentType,
      payment_currency: paymentCurrency,
      payment_amount: Number(paymentAmount.replace(/,/g, "")),
      php_equivalent: phpEquivalent ? Number(phpEquivalent.replace(/,/g, "")) : null,
      classes_included: Number(classesIncluded) || 0,
      classes_completed: Number(classesCompleted) || 0,
      class_duration: Number(duration) || 40,
      payment_status: paymentStatus,
      notes: notes.trim() || null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setShowModal(false);
    resetForm();
    loadData();
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-pink-600">Students</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your student enrollments, rates, assigned teacher aliases, and classroom links.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary cursor-pointer">
          + Add Student
        </button>
      </div>

      {/* Student Cards Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {students.map((student: any) => (
          <Link key={student.id} href={`/students/${student.id}`}>
            <div className="card cursor-pointer hover:shadow-md transition space-y-3 bg-white border border-pink-100 p-5 rounded-3xl">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{student.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {countries.find((item) => item.name === student.country)?.flag} {student.country}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-bold rounded-lg uppercase">
                  {student.teacher_alias || "Teacher Gabi"}
                </span>
              </div>

              <div className="bg-pink-50/40 p-3 rounded-2xl border border-pink-50 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Package:</span>
                  <span className="font-bold text-gray-800">
                    {student.classes_included || 30} Classes ({student.class_duration || 40}m)
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-gray-500">Rate:</span>
                  <span className="font-semibold text-pink-600">
                    {currencies[student.payment_currency]?.symbol}{" "}
                    {Number(String(student.payment_amount).replace(/,/g, "")).toLocaleString()}{" "}
                    {student.payment_currency}
                  </span>
                </div>
                {student.php_equivalent && (
                  <div className="flex justify-between text-[11px] text-pink-700 font-semibold">
                    <span>PHP Approx:</span>
                    <span>₱{Number(String(student.php_equivalent).replace(/,/g, "")).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-xl space-y-4">
            <h2 className="text-2xl font-bold text-pink-600">Add Student</h2>

            <div className="space-y-4">
              {/* Name & Teacher Alias */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Student Name *
                  </label>
                  <input
                    placeholder="e.g. Minh Nguyen"
                    className="input w-full text-xs"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Assigned Teacher Alias *
                  </label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={teacherAlias}
                    onChange={(e) => setTeacherAlias(e.target.value)}
                  >
                    {teacherAliases.map((alias) => (
                      <option key={alias} value={alias}>
                        {alias}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Classroom Video Link */}
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-700">
                  Classroom Video Link (Zoom / Meet URL)
                </label>
                <input
                  placeholder="https://meet.google.com/abc-defg-hij or Zoom link"
                  className="input w-full text-xs font-mono"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Email</label>
                  <input
                    placeholder="parent@example.com"
                    className="input w-full text-xs"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Phone</label>
                  <input
                    placeholder="+84 912 345 678"
                    className="input w-full text-xs"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Age</label>
                  <input
                    placeholder="e.g. 8"
                    type="number"
                    className="input w-full text-xs"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>

                {/* Country Selection */}
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Country *</label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={country}
                    onChange={(e) => {
                      const selected = e.target.value;
                      const selectedCountry = countries.find((item) => item.name === selected);
                      setCountry(selected);

                      if (selectedCountry) {
                        setPaymentCurrency(selectedCountry.currency);
                        calculatePHP(paymentAmount, selectedCountry.currency);
                      }
                    }}
                  >
                    <option value="">Select Country</option>
                    {countries.map((item) => (
                      <option key={item.name} value={item.name}>
                        {item.name} {item.flag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Currency & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Currency</label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={paymentCurrency}
                    onChange={(e) => {
                      const currency = e.target.value;
                      setPaymentCurrency(currency);
                      calculatePHP(paymentAmount, currency);
                    }}
                  >
                    {Object.keys(currencies).map((code) => (
                      <option key={code} value={code}>
                        {currencies[code].symbol} {code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Payment Amount *
                  </label>
                  <input
                    placeholder="e.g. 2,500,000"
                    className="input w-full text-xs"
                    value={paymentAmount}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, "");
                      if (raw === "") {
                        setPaymentAmount("");
                        setPhpEquivalent("");
                      } else if (!isNaN(Number(raw))) {
                        const formatted = Number(raw).toLocaleString();
                        setPaymentAmount(formatted);
                        calculatePHP(formatted, paymentCurrency);
                      }
                    }}
                  />
                </div>
              </div>

              {phpEquivalent && (
                <div className="p-2.5 bg-pink-50 rounded-xl text-xs font-semibold text-pink-700 flex justify-between">
                  <span>Estimated PHP Gross:</span>
                  <span>₱{phpEquivalent}</span>
                </div>
              )}

              {/* Classes Tracking */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Classes Included
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={classesIncluded}
                    onChange={(e) => setClassesIncluded(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Classes Completed
                  </label>
                  <input
                    type="number"
                    className="input w-full text-xs"
                    value={classesCompleted}
                    onChange={(e) => setClassesCompleted(e.target.value)}
                  />
                </div>
              </div>

              {/* Duration & Payment Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Class Duration
                  </label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={classDuration === "" ? "custom" : classDuration}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setClassDuration("");
                      } else {
                        setClassDuration(e.target.value);
                        setCustomDuration("");
                      }
                    }}
                  >
                    <option value="25">25 minutes</option>
                    <option value="40">40 minutes</option>
                    <option value="50">50 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                    <option value="custom">+ Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">
                    Payment Status
                  </label>
                  <select
                    className="input w-full text-xs bg-white"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Expired">Expired</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              {classDuration === "" && (
                <input
                  type="number"
                  placeholder="Enter custom duration (minutes)"
                  className="input w-full text-xs"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(e.target.value)}
                />
              )}

              <textarea
                placeholder="Notes..."
                rows={2}
                className="input w-full text-xs"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-pink-100">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-600 transition cursor-pointer"
              >
                Cancel
              </button>
              <button onClick={addStudent} className="btn-primary cursor-pointer text-xs">
                Save Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}