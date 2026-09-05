"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Folder, FolderOpen, ChevronDown, ChevronRight, ExternalLink, Plus, Trash2 } from "lucide-react";

export default function BooksPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null);

  // Form state for adding/editing book chapters
  const [newBookTitle, setNewBookTitle] = useState("");
  const [chaptersInput, setChaptersInput] = useState<{ title: string; url: string }[]>([
    { title: "", url: "" },
  ]);

  const fetchBooks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false });

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

    // Filter out empty chapter rows
    const validChapters = chaptersInput.filter((c) => c.title.trim() !== "");

    const { error } = await supabase.from("books").insert([
      {
        title: newBookTitle,
        chapters: validChapters,
      },
    ]);

    if (error) {
      alert("Error adding book: " + error.message);
    } else {
      setNewBookTitle("");
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
            Organize your PowerPoint files into collapsible folders
          </p>
        </div>
      </div>

      {/* Add New Book Form */}
      <form onSubmit={handleCreateBook} className="bg-white p-6 rounded-3xl border border-pink-100 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-pink-950">Add New Book Folder</h2>
        <div>
          <label className="block mb-1 text-xs font-semibold text-gray-700">Book Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Alpha Kids Level 1"
            className="border border-pink-200 p-3 w-full rounded-xl text-xs focus:outline-none focus:border-pink-500"
            value={newBookTitle}
            onChange={(e) => setNewBookTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700">Chapters / PPT Links</label>
          {chaptersInput.map((chap, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                placeholder={`Chapter ${idx + 1} Title (e.g. Unit 1: Phonics)`}
                className="border border-pink-200 p-2.5 flex-1 rounded-xl text-xs focus:outline-none"
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
                className="border border-pink-200 p-2.5 flex-1 rounded-xl text-xs focus:outline-none"
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
            const chapters = book.chapters || [];

            return (
              <div
                key={book.id}
                className="bg-white border border-pink-100 rounded-3xl shadow-xs overflow-hidden transition"
              >
                {/* Folder Header Bar */}
                <div
                  onClick={() => setExpandedBookId(isExpanded ? null : book.id)}
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-pink-50/40 transition"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <FolderOpen className="text-pink-600" size={20} />
                    ) : (
                      <Folder className="text-pink-600" size={20} />
                    )}
                    <h3 className="text-sm font-bold text-pink-950">{book.title}</h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {chapters.length} files
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
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
                    {isExpanded ? <ChevronDown size={18} className="text-pink-600" /> : <ChevronRight size={18} className="text-gray-400" />}
                  </div>
                </div>

                {/* Collapsible Content: Chapters & PPT Links */}
                {isExpanded && (
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
    </div>
  );
}