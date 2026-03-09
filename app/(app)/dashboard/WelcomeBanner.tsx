"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { getUserProfile, UserProfile } from "@/app/lib/firestore";

export default function WelcomeBanner() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load extended profile from Firestore to get photoURL and displayName
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getUserProfile(user.uid)
      .then((p) => setProfile(p))
      .finally(() => setLoading(false));
  }, [user]);

  // Use Auth displayName first, then Firestore, then email
  const name =
    user?.displayName ||
    profile?.displayName ||
    user?.email?.split("@")[0] ||
    "there";

  // Use Auth photoURL first, then Firestore, then initials
  const photoURL = user?.photoURL || profile?.photoURL;

  const initials =
    name?.slice(0, 2).toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "U";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <Link
      href="/profile"
      className="flex items-center gap-4 glass-card p-4 pr-6 hover:bg-white/10 transition group"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-xl overflow-hidden bg-sky-500/20 flex items-center justify-center border border-white/10 shrink-0">
        {photoURL && !loading ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoURL}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-base font-bold text-sky-300">{initials}</span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{greeting},</p>
        <p className="font-semibold text-white truncate">{name}</p>
      </div>

      {/* Arrow hint */}
      <span className="text-gray-600 group-hover:text-gray-400 transition text-xs">
        Edit profile →
      </span>
    </Link>
  );
}
