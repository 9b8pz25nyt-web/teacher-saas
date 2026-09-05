"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Check, Sparkles, Lock } from "lucide-react";

export default function SettingsPage() {
  const [aliases, setAliases] = useState<string[]>([]);
  const [newAlias, setNewAlias] = useState("");
  const [dashboardTitle, setDashboardTitle] = useState("ESL Teacher's Private Class Dashboard");
  
  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("teacher_aliases, dashboard_title")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.teacher_aliases) {
          setAliases(profile.teacher_aliases);
        } else {
          setAliases(["Teacher Gabi", "Teacher Princess"]);
        }

        if (profile?.dashboard_title) {
          setDashboardTitle(profile.dashboard_title);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, []);

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          user_id: user.id, 
          teacher_aliases: aliases,
          dashboard_title: dashboardTitle 
        }, { onConflict: "user_id" });

      if (error) throw error;
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword) return;

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Passwords do not match.");
      setPasswordSuccess(false);
      return;
    }

    setUpdatingPassword(true);
    setPasswordMessage("");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setUpdatingPassword(false);

    if (error) {
      setPasswordMessage("Error: " + error.message);
      setPasswordSuccess(false);
    } else {
      setPasswordSuccess(true);
      setPasswordMessage("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordMessage("");
        setPasswordSuccess(false);
      }, 3000);
    }
  }

  function addAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!newAlias.trim()) return;
    if (aliases.includes(newAlias.trim())) return;
    setAliases([...aliases, newAlias.trim()]);
    setNewAlias("");
  }

  function removeAlias(index: number) {
    setAliases(aliases.filter((_, i) => i !== index));
  }

  if (loading) {
    return <div className="p-12 text-center text-pink-600 font-medium">Loading settings...</div>;
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-pink-100 pb-4">
          <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
            <Sparkles size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-pink-950">Dashboard Settings</h1>
            <p className="text-xs text-gray-500">Manage your custom dashboard title and selectable teacher aliases.</p>
          </div>
        </div>

        {/* Dashboard Title Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-pink-950">Sidebar Dashboard Title</label>
          <input
            type="text"
            value={dashboardTitle}
            onChange={(e) => setDashboardTitle(e.target.value)}
            placeholder="e.g. Teacher Gabi's Hub"
            className="w-full p-2.5 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
          />
        </div>

        {/* Teacher Aliases Form and List */}
        <div className="border-t border-pink-100 pt-4 space-y-4">
          <label className="text-xs font-bold text-pink-950">Teacher Aliases & Personas</label>
          
          <form onSubmit={addAlias} className="flex gap-2">
            <input
              type="text"
              placeholder="Add new alias (e.g. Teacher Alex)"
              className="flex-1 p-2.5 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
            />
            <button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1 transition">
              <Plus size={14} /> Add
            </button>
          </form>

          <div className="space-y-2">
            {aliases.map((alias, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-pink-50/50 rounded-xl border border-pink-100 text-xs font-medium text-gray-800">
                <span>{alias}</span>
                <button
                  type="button"
                  onClick={() => removeAlias(index)}
                  className="text-gray-400 hover:text-red-600 p-1 transition cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-pink-100">
          {success && (
            <span className="text-emerald-600 text-xs font-bold flex items-center gap-1">
              <Check size={14} /> Saved successfully!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl cursor-pointer shadow-xs transition"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>

      {/* Password Update Section */}
      <div className="bg-white border border-pink-100 rounded-3xl p-6 shadow-xs space-y-6">
        <div className="flex items-center gap-3 border-b border-pink-100 pb-4">
          <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
            <Lock size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-pink-950">Security</h1>
            <p className="text-xs text-gray-500">Update your account password.</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-pink-950">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full p-2.5 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-pink-950">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full p-2.5 text-xs rounded-xl border border-pink-200 focus:outline-hidden focus:ring-2 focus:ring-pink-400"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {passwordMessage && (
              <span className={`text-xs font-bold flex items-center gap-1 ${passwordSuccess ? "text-emerald-600" : "text-red-600"}`}>
                {passwordSuccess && <Check size={14} />} {passwordMessage}
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={updatingPassword}
                className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-6 py-2.5 rounded-xl cursor-pointer shadow-xs transition"
              >
                {updatingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}