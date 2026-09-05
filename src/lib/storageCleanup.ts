import { supabase } from "@/lib/supabase";

export async function cleanupOldHomeworkFiles(daysOld: number = 30) {
  // 1. Calculate the cutoff date (e.g., 30 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  const cutoffIso = cutoffDate.toISOString().split("T")[0];

  // 2. Find all class reports older than the cutoff date that still have files
  const { data: oldReports, error: fetchError } = await supabase
    .from("class_reports")
    .select("id, homework_file_url, homework_submission_url")
    .lt("report_date", cutoffIso);

  if (fetchError || !oldReports || oldReports.length === 0) {
    return { count: 0, message: "No old files found to clean up." };
  }

  const filesToDelete: string[] = [];
  const reportIdsToClear: string[] = [];

  // Helper to extract file path from a Supabase public URL
  const getStoragePath = (url: string) => {
    const parts = url.split("/homework-files/");
    return parts[1] ? decodeURIComponent(parts[1]) : null;
  };

  oldReports.forEach((rep) => {
    if (rep.homework_file_url) {
      const path = getStoragePath(rep.homework_file_url);
      if (path) filesToDelete.push(path);
    }
    if (rep.homework_submission_url) {
      const path = getStoragePath(rep.homework_submission_url);
      if (path) filesToDelete.push(path);
    }
    if (rep.homework_file_url || rep.homework_submission_url) {
      reportIdsToClear.push(rep.id);
    }
  });

  if (filesToDelete.length === 0) {
    return { count: 0, message: "No files needed deletion." };
  }

  // 3. Remove the physical files from the storage bucket
  const { error: storageError } = await supabase.storage
    .from("homework-files")
    .remove(filesToDelete);

  if (storageError) throw storageError;

  // 4. Clear the file links in the database (keeping all lesson text feedback intact)
  await supabase
    .from("class_reports")
    .update({
      homework_file_url: null,
      homework_submission_url: null,
    })
    .in("id", reportIdsToClear);

  return {
    count: filesToDelete.length,
    message: `Successfully deleted ${filesToDelete.length} old homework files!`,
  };
}