"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { countries } from "@/constants/countries";
import { currencies } from "@/constants/currencies";

export default function StudentEditModal({
  student,
  onClose,
  onSave,
  books,
  selectedBookIds,
  setSelectedBookIds,
  teacherAliases,
  name,
  setName,
  teacherAlias,
  setTeacherAlias,
  meetingLink,
  setMeetingLink,
  email,
  setEmail,
  phone,
  setPhone,
  age,
  setAge,
  country,
  setCountry,
  paymentCurrency,
  setPaymentCurrency,
  paymentAmount,
  setPaymentAmount,
  phpEquivalent,
  classesIncluded,
  setClassesIncluded,
  freeClasses,
  setFreeClasses,
  classesCompleted,
  setClassesCompleted,
  classDuration,
  setClassDuration,
  paymentStatus,
  setPaymentStatus,
  notes,
  setNotes,
}: any) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl p-6 rounded-3xl shadow-xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-pink-100 pb-4">
          <h2 className="text-xl font-bold text-pink-600">Edit Student Profile</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-pink-50 cursor-pointer text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Student Name *</label>
              <input
                type="text"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Assigned Teacher Alias</label>
              <select
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={teacherAlias}
                onChange={(e) => setTeacherAlias(e.target.value)}
              >
                {teacherAliases.map((alias: string) => (
                  <option key={alias} value={alias}>
                    {alias}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Classroom Video Link (Zoom / Meet URL)</label>
            <input
              type="text"
              className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
              placeholder="https://zoom.us/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Email</label>
              <input
                type="email"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Phone</label>
              <input
                type="text"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Age</label>
              <input
                type="number"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Country</label>
              <select
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Select country...</option>
                {countries.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assigned Curriculum / Books */}
          <div>
            <label className="block mb-1 font-semibold text-gray-700">
              Assigned Curriculum / Books (Select up to 2)
            </label>
            <div className="space-y-2">
              <select
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800 cursor-pointer"
                value=""
                onChange={(e) => {
                  const bookId = e.target.value;
                  if (!bookId) return;
                  if (selectedBookIds.includes(bookId)) return;
                  if (selectedBookIds.length >= 2) {
                    alert("You can select a maximum of 2 books.");
                    return;
                  }
                  setSelectedBookIds([...selectedBookIds, bookId]);
                }}
              >
                <option value="">+ Add a book...</option>
                {books && books.length > 0 ? (
                  books
                    .filter((b: any) => !selectedBookIds.includes(b.id))
                    .map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.title} {b.level ? `(${b.level})` : ""}
                      </option>
                    ))
                ) : (
                  <option disabled value="">
                    No books found in database
                  </option>
                )}
              </select>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedBookIds.length === 0 ? (
                  <span className="text-[11px] text-gray-400 italic">
                    No books selected yet.
                  </span>
                ) : (
                  selectedBookIds.map((id: string) => {
                    const book = books.find((b: any) => b.id === id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-pink-50 text-pink-700 border border-pink-200 rounded-xl text-xs font-semibold"
                      >
                        <span>📖 {book?.title || "Book"}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBookIds(
                              selectedBookIds.filter((bId: string) => bId !== id)
                            )
                          }
                          className="text-pink-400 hover:text-red-600 transition cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Payment Currency</label>
              <select
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={paymentCurrency}
                onChange={(e) => setPaymentCurrency(e.target.value)}
              >
                {Object.keys(currencies).map((cur) => {
                  const currData = (currencies as Record<string, any>)[cur];
                  return (
                    <option key={cur} value={cur}>
                      {cur} ({currData?.symbol || ""})
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Payment Amount</label>
              <input
                type="text"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Classes Included</label>
              <input
                type="number"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={classesIncluded}
                onChange={(e) => setClassesIncluded(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Free Classes</label>
              <input
                type="number"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={freeClasses}
                onChange={(e) => setFreeClasses(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Classes Completed</label>
              <input
                type="number"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={classesCompleted}
                onChange={(e) => setClassesCompleted(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 font-semibold text-gray-700">Duration (mins)</label>
              <input
                type="number"
                className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800"
                value={classDuration}
                onChange={(e) => setClassDuration(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Payment Status</label>
            <select
              className="w-full border border-pink-200 rounded-xl p-2.5 bg-white text-gray-800 text-xs"
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Active">Active</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 font-semibold text-gray-700">Teacher Notes</label>
            <textarea
              className="input w-full border border-gray-200 rounded-xl p-2.5 bg-white text-gray-800 h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 rounded-xl bg-pink-600 text-white font-bold hover:bg-pink-700 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}