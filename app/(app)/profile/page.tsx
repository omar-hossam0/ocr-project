"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Camera,
  Save,
  User,
  Mail,
  Phone,
  Building2,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import {
  getUserProfile,
  saveUserProfile,
  uploadProfilePhotoResumable,
  UserProfile,
} from "@/app/lib/firestore";

export default function ProfilePage() {
  const { user, updateUserProfile, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("Legal");
  const [role, setRole] = useState("Editor");
  const [bio, setBio] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile on mount
  useEffect(() => {
    if (!user) return;

    setDisplayName(user.displayName || "");
    setPhotoURL(user.photoURL || null);

    getUserProfile(user.uid).then((profile: UserProfile | null) => {
      if (profile) {
        setPhone(profile.phone || "");
        setDepartment(profile.department || "Legal");
        setRole(profile.role || "Editor");
        setBio(profile.bio || "");
        if (profile.photoURL) setPhotoURL(profile.photoURL);
      }
    });
  }, [user]);

  // Resize image to max 800px and compress to JPEG < ~200KB
  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        const MAX = 800;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"));
              return;
            }
            resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.82,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = blobUrl;
    });

  const handlePhotoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;

      // Show instant local preview
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      setUploadingPhoto(true);
      setUploadProgress(0);
      setError("");
      setSuccess("");

      try {
        const compressed = await compressImage(file);
        console.log(
          `📸 Uploading compressed image ${Math.round(compressed.size / 1024)}KB...`,
        );
        const url = await uploadProfilePhotoResumable(
          compressed,
          user.uid,
          (pct) => setUploadProgress(pct),
        );
        console.log(`✅ Photo uploaded successfully: ${url}`);
        // Upload done — update state
        URL.revokeObjectURL(previewUrl);
        setPhotoPreview(null);
        setPhotoURL(url);

        // Use current displayName or existing one
        const currentName = displayName.trim() || user.displayName || "User";

        // Persist to Auth first (updates Firebase Auth user object)
        await updateUserProfile(currentName, url);

        // Then save full profile to Firestore (includes all fields)
        await saveUserProfile(user.uid, {
          displayName: currentName,
          photoURL: url,
        });

        setSuccess("Photo updated successfully!");
        setTimeout(() => setSuccess(""), 3000);
      } catch (err) {
        console.error("❌ Photo upload error:", err);
        const errMsg =
          err instanceof Error ? err.message : "Photo upload failed";
        setError(errMsg);
        // Keep the preview but don't save
        setTimeout(() => {
          setPhotoPreview(null);
          setUploadingPhoto(false);
        }, 1500);
      } finally {
        setUploadingPhoto(false);
        setUploadProgress(0);
        // Reset input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [user, displayName, updateUserProfile],
  );

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const finalPhotoURL = photoURL || undefined;

      // Update Firebase Auth profile
      await updateUserProfile(displayName, finalPhotoURL);

      // Save extended profile to Firestore
      await saveUserProfile(user.uid, {
        displayName,
        phone,
        department,
        role,
        bio,
        photoURL: finalPhotoURL,
      });

      // Refresh user context so Dashboard sees updated data
      await refreshUser();

      setSuccess("Profile saved successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }, [
    user,
    displayName,
    phone,
    department,
    role,
    bio,
    photoURL,
    updateUserProfile,
    refreshUser,
  ]);

  const currentPhoto = useMemo(
    () => photoPreview || photoURL,
    [photoPreview, photoURL],
  );
  const initials = useMemo(
    () =>
      displayName?.slice(0, 2).toUpperCase() ||
      user?.email?.slice(0, 2).toUpperCase() ||
      "U",
    [displayName, user?.email],
  );

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-gray-400 text-sm mt-1">
          Manage your personal information and account settings
        </p>
      </div>

      {/* Avatar + Basic Info Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-white/10">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-sky-500/20 flex items-center justify-center border-2 border-white/10">
              {currentPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPhoto}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-sky-300">
                  {initials}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Camera className="w-6 h-6 text-white" />
            </button>
            {uploadingPhoto && (
              <div className="absolute inset-0 rounded-2xl bg-black/70 flex flex-col items-center justify-center gap-1">
                {uploadProgress < 100 ? (
                  <>
                    <span className="text-white font-bold text-lg leading-none">
                      {uploadProgress}%
                    </span>
                    <div className="w-14 h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-400 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* Name + Email */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">
              {displayName || user?.email?.split("@")[0] || "Account"}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-1 rounded-full">
                {role}
              </span>
              <span className="text-xs bg-white/10 text-gray-300 px-2.5 py-1 rounded-full">
                {department}
              </span>
            </div>
          </div>
        </div>

        {/* Success / Error */}
        {success && (
          <div className="mt-4 flex items-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Form Fields */}
        <div className="mt-6 grid sm:grid-cols-2 gap-5">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/10 bg-white/5 text-gray-400 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+20 100 000 0000"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Department
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition appearance-none"
              >
                <option>Legal</option>
                <option>HR</option>
                <option>Finance</option>
                <option>Operations</option>
                <option>IT</option>
                <option>Administration</option>
              </select>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Role
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition appearance-none"
              >
                <option>Admin</option>
                <option>Editor</option>
                <option>Viewer</option>
              </select>
            </div>
          </div>

          {/* Bio — full width */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description about yourself..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition resize-none"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
