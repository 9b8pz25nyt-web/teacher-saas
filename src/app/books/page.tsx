"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Folder, FolderOpen, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2, Edit } from "lucide-react";

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Form state for adding book
  const [newBookTitle, setNewBookTitle] = useState("");
  const [newBookType, setNewBookType] = useState("chapters");
  const [newTotalPages, setNewTotalPages] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [chaptersInput, setChaptersInput] = useState<{ title: string; url: string }[]>([
    { title: "", url: "" },
  ]);

  function handleOpenEditBook(book: any) {
    setEditingBookId(book.id);
    setEditBookTitle(book.title || "");
    setEditBookType(book.book_type || "chapters");
    setEditTotalPages(book.total_pages ? String(book.total_pages) : "");
    setEditFileUrl(book.file_url || book.link || book.drive_url || "");
    setEditChaptersInput(book.chapters && book.chapters.length > 0 ? book.chapters : [{ title: "", url: "" }]);
    setIsEditModalOpen(true);
  }

  async function handleUpdateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!editBookTitle.trim()) return;

    const validChapters = editBookType === "chapters" ? editChaptersInput.filter((c) => c.title.trim() !== "") : [];
    const pagesCount = editBookType === "pages" ? Number(editTotalPages) || 0 : null;

    const { error } = await supabase
      .from("books")
      .update({
        title: editBookTitle.trim(),
        book_type: editBookType,
        total_pages: pagesCount,
        file_url: editFileUrl.trim() || null,
        chapters: validChapters,
      })
      .eq("id", editingBookId);

    if (error) {
      alert("Error updating book: " + error.message);
    } else {
      setIsEditModalOpen(false);
      setEditingBookId(null);
      fetchBooks();
    }
  }

  const fetchBooks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("title", { ascending: true }); // 👈 Arranges books alphabetically (A-Z)

      if (error) console.error("Error fetching books:", error.message);
      else if (data) setBooks(data);
    } catch (err) {
      console.error("Fetch books error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault();
    if (!newBookTitle.trim()) return;

    const validChapters = newBookType === "chapters" ? chaptersInput.filter((c) => c.title.trim() !== "") : [];
    const pagesCount = newBookType === "pages" ? Number(newTotalPages) || 0 : null;

    const { error } = await supabase.from("books").insert([
      {
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
      fetchBooks();
    }
  }

  async function handleDeleteBook(id: string) {
    if (!confirm("Are you sure you want to delete this book folder?")) return;
    const { error } = await supabase.from("books").delete().eq("id", id);
    if (error) alert("Error deleting book: " + error.message);
    else fetchBooks();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-pink-950">Curriculum Books 📚</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organize your books into chapter curricula or standalone page files
          </p>
        </div>
      </div>

      {/* Add New Book Form */}
      <form onSubmit={handleCreateBook} className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-pink-950">Add New Book / File</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700">Book Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Alpha Kids Level 1"
              className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500 bg-white"
              value={newBookTitle}
              onChange={(e) => setNewBookTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block mb-1 text-xs font-semibold text-gray-700">Tracking Type *</label>
            <select
              className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500 bg-white cursor-pointer"
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
                className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500 bg-white"
                value={newTotalPages}
                onChange={(e) => setNewTotalPages(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 text-xs font-semibold text-gray-700">Book Link / Drive URL (Optional) 🔗</label>
              <input
                type="url"
                placeholder="https://drive.google.com/... or OneDrive link"
                className="border border-pink-200 p-3 w-full rounded-xl text-xs font-mono focus:outline-none focus:border-pink-500 bg-white"
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
                  placeholder={`Chapter ${idx + 1} Title (e.g. Unit 1: Phonics)`}
                  className="border border-pink-200 p-2.5 flex-1 rounded-xl text-xs focus:outline-none bg-white"
                  value={chap.title}
                  onChange={(e) => {
                    const updated = [...chaptersInput];
                    updated[idx].title = e.target.value;
                    setChaptersInput(updated);
                  }}
                />
                <input
                  type="url"
                  placeholder="PPT or Google Slides URL (https://...)"
                  className="border border-pink-200 p-2.5 flex-1 rounded-xl text-xs focus:outline-none bg-white"
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
              <div
                key={book.id}
                className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden transition"
              >
                {/* Folder Header Bar */}
                <div
                  onClick={() => !isPageBased && setExpandedBookId(isExpanded ? null : book.id)}
                  className={`p-5 flex items-center justify-between transition ${!isPageBased ? "cursor-pointer hover:bg-pink-50/40" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {isPageBased ? (
                      <Folder className="text-pink-600" size={20} />
                    ) : isExpanded ? (
                      <FolderOpen className="text-pink-600" size={20} />
                    ) : (
                      <Folder className="text-pink-600" size={20} />
                    )}
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
                        handleOpenEditBook(book);
                      }}
                      className="text-gray-400 hover:text-pink-600 p-1 transition cursor-pointer"
                      title="Edit Book"
                    >
                      <Edit size={16} />
                    </button>
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

                {/* Collapsible Content: Chapters & PPT Links */}
                {isExpanded && !isPageBased && (
                  <div className="px-6 pb-5 pt-2 border-t border-pink-50 space-y-2 bg-pink-50/20">
                    {chapters.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No chapters or PPT files added to this folder yet.</p>
                    ) : (
                      chapters.map((chap: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-white p-3 rounded-2xl border border-pink-100 shadow-2xs"
                        >
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

      {/* EDIT BOOK MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-3">
              <h2 className="text-base font-bold text-pink-950">Edit Book Folder</h2>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Book Title *</label>
                  <input
                    type="text"
                    required
                    className="border border-pink-200 p-3 w-full rounded-xl focus:outline-none focus:border-pink-500 bg-white"
                    value={editBookTitle}
                    onChange={(e) => setEditBookTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-gray-700">Tracking Type *</label>
                  <select
                    className="border border-pink-200 p-3 w-full rounded-xl focus:outline-none focus:border-pink-500 bg-white cursor-pointer"
                    value={editBookType}
                    onChange={(e) => setEditBookType(e.target.value)}
                  >
                    <option value="chapters">Chapter-Based Curriculum</option>
                    <option value="pages">Page-Based Standalone File</option>
                  </select>
                </div>
              </div>

              {editBookType === "pages" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1 font-semibold text-gray-700">Total Pages *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="border border-pink-200 p-3 w-full rounded-xl focus:outline-none focus:border-pink-500 bg-white"
                      value={editTotalPages}
                      onChange={(e) => setEditTotalPages(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-semibold text-gray-700">Book Link / Drive URL (Optional) 🔗</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/..."
                      className="border border-pink-200 p-3 w-full rounded-xl font-mono focus:outline-none focus:border-pink-500 bg-white"
                      value={editFileUrl}
                      onChange={(e) => setEditFileUrl(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block font-semibold text-gray-700">Chapters / PPT Links</label>
                  {editChaptersInput.map((chap, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Chapter ${idx + 1} Title`}
                        className="border border-pink-200 p-2.5 flex-1 rounded-xl focus:outline-none bg-white"
                        value={chap.title}
                        onChange={(e) => {
                          const updated = [...editChaptersInput];
                          updated[idx].title = e.target.value;
                          setEditChaptersInput(updated);
                        }}
                      />
                      <input
                        type="url"
                        placeholder="PPT or Google Slides URL"
                        className="border border-pink-200 p-2.5 flex-1 rounded-xl focus:outline-none bg-white"
                        value={chap.url}
                        onChange={(e) => {
                          const updated = [...editChaptersInput];
                          updated[idx].url = e.target.value;
                          setEditChaptersInput(updated);
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditChaptersInput([...editChaptersInput, { title: "", url: "" }])}
                    className="text-pink-600 font-bold hover:underline pt-1 cursor-pointer"
                  >
                    + Add another chapter slot
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-pink-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}