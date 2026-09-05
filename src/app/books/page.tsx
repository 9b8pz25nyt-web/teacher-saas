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