"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Folder, FolderOpen, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2, Edit, Clock, Briefcase, DollarSign } from "lucide-react";

export default function BooksPage() {
  const [profession, setProfession] = useState<string>("teacher");
  const [activeTab, setActiveTab] = useState<"books" | "work">("books");
  const [loading, setLoading] = useState(true);

  // Books State (Teacher Mode)
  const [books, setBooks] = useState<any[]>([]);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editBookTitle, setEditBookTitle] = useState("");
  const [editBookType, setEditBookType] = useState("chapters");
  const [editTotalPages, setEditTotalPages] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editChaptersInput, setEditChaptersInput] = useState<{ title: string; url: string }[]>([
    { title: "", url: "" },
  ]);

  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookType, setNewBookType] = useState("chapters");
  const [newTotalPages, setNewTotalPages] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [chaptersInput, setChaptersInput] = useState<{ title: string; url: string }[]>([
    { title: "", url: "" },
  ]);

  // Freelancer Work Logs State
  const [clients, setClients] = useState<any[]>([]);
  const [workLogs, setWorkLogs] = useState<any[]>([]);
  const [billingType, setBillingType] = useState<"hourly" | "fixed">("hourly");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [projectFee, setProjectFee] = useState("");
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [workNotes, setWorkNotes] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile & profession
      const { data: profile } = await supabase
        .from("profiles")
        .select("profession")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.profession) {
        setProfession(profile.profession);
      }

      // Fetch books
      const { data: bookData } = await supabase
        .from("books")
        .select("*")
        .eq("user_id", user.id)
        .order("title", { ascending: true });

      if (bookData) setBooks(bookData);

      // Fetch clients (students table)
      const { data: clientData } = await supabase
        .from("students")
        .select("*")
        .eq("teacher_id", user.id);

      if (clientData) setClients(clientData);

      // Fetch work logs (lessons table or project logs)
      const { data: logsData } = await supabase
        .from("lessons")
        .select("*, students(name)")
        .eq("teacher_id", user.id)
        .order("lesson_date", { ascending: false });

      if (logsData) setWorkLogs(logsData);

    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const validChapters = newBookType === "chapters" ? chaptersInput.filter((c) => c.title.trim() !== "") : [];
    const pagesCount = newBookType === "pages" ? Number(newTotalPages) || 0 : null;

    const { error } = await supabase.from("books").insert([
      {
        user_id: user.id,
        title: newBookTitle.trim(),
        book_type: newBookType,
        total_pages: pagesCount,
        file_url: newFileUrl.trim() || null,
        chapters: validChapters,
      },
    ]);

    if (error) {
      alert("Error adding book: " + error.message);
    } else {
      setNewBookTitle("");
      setNewBookType("chapters");
      setNewTotalPages("");
      setNewFileUrl("");
      setChaptersInput([{ title: "", url: "" }]);
      fetchData();
    }
  }

  async function handleDeleteBook(id: string) {
    if (!confirm("Are you sure you want to delete this book folder?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) alert("Error deleting book: " + error.message);
    else fetchData();
  }

  async function handleLogWork(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId) {
      alert("Please select a client.");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const totalAmount = billingType === "hourly"
      ? (Number(hoursWorked) || 0) * (Number(hourlyRate) || 0)
      : (Number(projectFee) || 0);

    const { error } = await supabase.from("lessons").insert({
      teacher_id: user.id,
      student_id: selectedClientId,
      lesson_date: workDate,
      status: "Completed",
      notes: billingType === "fixed" ? `[Fixed Project: ${projectTitle}] ${workNotes}` : `[Hourly: ${hoursWorked} hrs @ ₱${hourlyRate}] ${workNotes}`,
    });

    if (error) {
      alert("Error logging work: " + error.message);
    } else {
      setHoursWorked("");
      setHourlyRate("");
      setProjectTitle("");
      setProjectFee("");
      setWorkNotes("");
      fetchData();
      alert("Work entry saved successfully!");
    }
  }

  const isFreelancer = profession === "freelancer";
  const isBoth = profession === "both";

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-pink-950">
            {isFreelancer ? "Billable Hours & Projects ⏱️" : isBoth ? "Curriculum Books & Projects 📚" : "Curriculum Books 📚"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isFreelancer 
              ? "Track your hourly billable work or fixed project milestone fees." 
              : "Organize your books into chapter curricula or standalone page files."}
          </p>
        </div>

        {/* If 'Both' mode, show quick switcher */}
        {isBoth && (
          <div className="flex bg-pink-50 p-1 rounded-xl border border-pink-100 text-xs font-bold">
            <button
              onClick={() => setActiveTab("books")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === "books" ? "bg-pink-600 text-white" : "text-gray-600"}`}
            >
              Curriculum Books
            </button>
            <button
              onClick={() => setActiveTab("work")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${activeTab === "work" ? "bg-pink-600 text-white" : "text-gray-600"}`}
            >
              Billable Hours
            </button>
          </div>
        )}
      </div>

      {/* FREELANCER MODE OR ACTIVE WORK TAB */}
      {(isFreelancer || (isBoth && activeTab === "work")) ? (
        <div className="space-y-6">
          {/* Add Work / Project Form */}
          <form onSubmit={handleLogWork} className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4 text-xs">
            <h2 className="text-base font-bold text-pink-950 flex items-center gap-2">
              <Clock size={18} className="text-pink-600" />
              <span>Log Billable Hours or Fixed Project</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Select Client *</label>
                <select
                  required
                  className="border border-pink-200 p-3 w-full rounded-xl focus:outline-none focus:border-pink-500 bg-white cursor-pointer"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">-- Choose Client --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700">Billing Type *</label>
                <div className="grid grid-cols-2 gap-2 bg-pink-50 p-1 rounded-xl border border-pink-100">
                  <button
                    type="button"
                    onClick={() => setBillingType("hourly")}
                    className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${billingType === "hourly" ? "bg-pink-600 text-white" : "text-gray-600"}`}
                  >
                    <Clock size={13} />
                    <span>Hourly Rate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingType("fixed")}
                    className={`py-2 rounded-lg font-bold transition flex items-center justify-center gap-1 cursor-pointer ${billingType === "fixed" ? "bg-pink-600 text-white" : "text-gray-600"}`}
                  >
                    <Briefcase size={13} />
                    <span>Fixed Project</span>
                  </button>
                </div>
              </div>
            </div>

            {billingType === "hourly" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Hours Worked *</label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    placeholder="e.g. 3.5"
                    className="border border-pink-200 p-3 w-full rounded-xl bg-white font-semibold"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Hourly Rate (PHP) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    className="border border-pink-200 p-3 w-full rounded-xl bg-white font-semibold text-pink-700"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Project / Milestone Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Website Redesign Phase 1"
                    className="border border-pink-200 p-3 w-full rounded-xl bg-white font-semibold"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Project Fee (PHP) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15000"
                    className="border border-pink-200 p-3 w-full rounded-xl bg-white font-semibold text-pink-700"
                    value={projectFee}
                    onChange={(e) => setProjectFee(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Date Completed *</label>
                <input
                  type="date"
                  required
                  className="border border-pink-200 p-3 w-full rounded-xl bg-white"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 font-semibold text-gray-700">Notes / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief details about deliverables..."
                  className="border border-pink-200 p-3 w-full rounded-xl bg-white"
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-5 py-2.5 rounded-xl transition cursor-pointer shadow-xs"
            >
              Save Work Entry
            </button>
          </form>

          {/* Past Work Logs List */}
          <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-pink-950">Logged Work & Projects History</h2>
            {workLogs.length === 0 ? (
              <p className="text-xs text-gray-400">No work or project entries recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {workLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-pink-50/40 rounded-2xl border border-pink-100 text-xs">
                    <div>
                      <h3 className="font-bold text-pink-950">{log.students?.name || "Client"}</h3>
                      <p className="text-gray-600 mt-0.5">{log.notes || "No notes provided"}</p>
                      <span className="text-[10px] text-gray-400">{log.lesson_date}</span>
                    </div>
                    <span className="px-3 py-1 bg-white text-pink-700 font-bold rounded-xl border border-pink-200 shadow-2xs">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TEACHER MODE BOOKS VIEW */
        <div className="space-y-6">
          <form onSubmit={handleCreateBook} className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-pink-950">Add New Book / File</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-700">Book Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alpha Kids Level 1"
                  className="border border-pink-200 p-3 w-full rounded-xl text-xs bg-white"
                  value={newBookTitle}
                  onChange={(e) => setNewBookTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-700">Tracking Type *</label>
                <select
                  className="border border-pink-200 p-3 w-full rounded-xl text-xs bg-white cursor-pointer"
                  value={newBookType}
                  onChange={(e) => setNewBookType(e.target.value)}
                >
                  <option value="chapters">Chapter-Based Curriculum</option>
                  <option value="pages">Page-Based Standalone File</option>
                </select>
              </div>
            </div>

            {newBookType === "pages" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Total Pages *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 50"
                    className="border border-pink-200 p-3 w-full rounded-xl text-xs bg-white"
                    value={newTotalPages}
                    onChange={(e) => setNewTotalPages(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-700">Book Link / Drive URL (Optional) 🔗</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    className="border border-pink-200 p-3 w-full rounded-xl text-xs font-mono bg-white"
                    value={newFileUrl}
                    onChange={(e) => setNewFileUrl(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-700">Chapters / PPT Links</label>
                {chaptersInput.map((chap, idx) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      placeholder={`Chapter ${idx + 1} Title`}
                      className="border border-pink-200 p-2.5 flex-1 rounded-xl text-xs bg-white"
                      value={chap.title}
                      onChange={(e) => {
                        const updated = [...chaptersInput];
                        updated[idx].title = e.target.value;
                        setChaptersInput(updated);
                      }}
                    />
                    <input
                      type="url"
                      placeholder="PPT or Google Slides URL"
                      className="border border-pink-200 p-2.5 flex-1 rounded-xl text-xs bg-white"
                      value={chap.url}
                      onChange={(e) => {
                        const updated = [...chaptersInput];
                        updated[idx].url = e.target.value;
                        setChaptersInput(updated);
                      }}
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setChaptersInput([...chaptersInput, { title: "", url: "" }])}
                  className="text-xs text-pink-600 font-bold hover:underline pt-1 cursor-pointer"
                >
                  + Add another chapter slot
                </button>
              </div>
            )}

            <button
              type="submit"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
            >
              Create Book Folder
            </button>
          </form>

          {/* Book Folders List */}
          <div className="space-y-4">
            {loading ? (
              <p className="text-xs text-gray-500">Loading books...</p>
            ) : books.length === 0 ? (
              <p className="text-xs text-gray-500">No book folders created yet.</p>
            ) : (
              books.map((book) => {
                const isExpanded = expandedBookId === book.id;
                const isPageBased = book.book_type === "pages";
                const chapters = book.chapters || [];

                return (
                  <div key={book.id} className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden transition">
                    <div
                      onClick={() => !isPageBased && setExpandedBookId(isExpanded ? null : book.id)}
                      className={`p-5 flex items-center justify-between transition ${!isPageBased ? "cursor-pointer hover:bg-pink-50/40" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="text-pink-600" size={20} />
                        <div>
                          <h3 className="text-sm font-bold text-pink-950 flex items-center gap-2">
                            <span>{book.title}</span>
                            <span className="px-2 py-0.5 bg-pink-50 text-pink-700 rounded-lg text-[10px] font-semibold border border-pink-200 uppercase">
                              {isPageBased ? `Page-Based (${book.total_pages || 0} pages)` : "Chapter-Based"}
                            </span>
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {isPageBased && (book.file_url || book.link || book.drive_url) && (
                          <a
                            href={book.file_url || book.link || book.drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <span>Open Book</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBook(book.id);
                          }}
                          className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                          title="Delete Book"
                        >
                          <Trash2 size={16} />
                        </button>
                        {!isPageBased && (
                          isExpanded ? <ChevronDown size={18} className="text-pink-600" /> : <ChevronRight size={18} className="text-gray-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && !isPageBased && (
                      <div className="px-6 pb-5 pt-2 border-t border-pink-50 space-y-2 bg-pink-50/20">
                        {chapters.length === 0 ? (
                          <p className="text-xs text-gray-400 py-2">No chapters or PPT files added to this folder yet.</p>
                        ) : (
                          chapters.map((chap: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-pink-100 shadow-2xs">
                              <span className="text-xs font-semibold text-gray-700">
                                {idx + 1}. {chap.title}
                              </span>
                              {chap.url ? (
                                <a
                                  href={chap.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                                >
                                  <span>Open PPT</span>
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400 italic">No link provided</span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}