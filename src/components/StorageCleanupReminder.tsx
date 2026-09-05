"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, Trash2 } from "lucide-react";
import { cleanupOldHomeworkFiles } from "@/lib/storageCleanup";

const LAST_CLEANUP_KEY = "teacher_last_storage_cleanup";

export default function StorageCleanupReminder() {
  const [shouldShow, setShouldShow] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  useEffect(() => {
    const lastCleanupStr = localStorage.getItem(LAST_CLEANUP_KEY);
    
    if (!lastCleanupStr) {
      // First time user: show reminder
      setShouldShow(true);
      return;
    }

    const lastCleanupDate = new Date(lastCleanupStr);
    const now = new Date();
    
    // Difference in days
    const diffDays = Math.floor(
      (now.getTime() - lastCleanupDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Show reminder if 30 days or more have passed since last cleanup
    if (diffDays >= 30) {
      setShouldShow(true);
    }
  }, []);

  async function handleQuickCleanup() {
    if (
      !confirm(
        "Delete worksheet images & homework files older than 30 days? All lesson notes, topics, and student feedback will stay 100% safe."
      )
    ) {
      return;
    }

    setIsCleaning(true);
    try {
      const result = await cleanupOldHomeworkFiles(30);
      localStorage.setItem(LAST_CLEANUP_KEY, new Date().toISOString());
      alert(result.message);
      setShouldShow(false);
    } catch (err: any) {
      console.error("Cleanup error:", err);
      alert("Failed to clean up files: " + (err.message || err));
    } finally {
      setIsCleaning(false);
    }
  }

  function handleDismiss() {
    // Snooze for 7 days
    const snoozeDate = new Date();
    snoozeDate.setDate(snoozeDate.getDate() - 23); // 30 - 23 = 7 days remaining
    localStorage.setItem(LAST_CLEANUP_KEY, snoozeDate.toISOString());
    setShouldShow(false);
  }

  if (!shouldShow) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-amber-600 shrink-0" />
        <span>
          <strong>Monthly Storage Reminder:</strong> It has been over 30 days since your last file cleanup. Clean old homework uploads to stay well within your free quota.
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleQuickCleanup}
          disabled={isCleaning}
          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-1 shadow-2xs"
        >
          <Trash2 size={12} />
          <span>{isCleaning ? "Cleaning..." : "Clean Now"}</span>
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-100 rounded-lg text-amber-700 transition cursor-pointer"
          title="Dismiss for 7 days"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}