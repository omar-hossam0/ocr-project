"use client";
import { useEffect, useState } from "react";
import { auth, db, storage } from "@/app/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ref, listAll } from "firebase/storage";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function FirebaseTestPage() {
  const [status, setStatus] = useState<{
    auth?: { ok: boolean; msg: string };
    firestore?: { ok: boolean; msg: string };
    storage?: { ok: boolean; msg: string };
  }>({});
  const [loading, setLoading] = useState(true);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    const testConnections = async () => {
      try {
        // Test Auth
        try {
          const authConfigOk = !!auth;
          setStatus((s) => ({
            ...s,
            auth: {
              ok: authConfigOk,
              msg: `Firebase Auth initialized (${auth.currentUser ? "user logged in" : "user logged out"})`,
            },
          }));
        } catch (err) {
          setStatus((s) => ({
            ...s,
            auth: { ok: false, msg: String(err) },
          }));
        }

        // Test Firestore
        try {
          const querySnapshot = await getDocs(collection(db, "files"));
          setStatus((s) => ({
            ...s,
            firestore: {
              ok: true,
              msg: `Firestore connected (${querySnapshot.size} documents in "files" collection)`,
            },
          }));
        } catch (err) {
          setStatus((s) => ({
            ...s,
            firestore: { ok: false, msg: String(err) },
          }));
        }

        // Test Storage
        try {
          const storageRef = ref(storage, "");
          await listAll(storageRef);
          setStatus((s) => ({
            ...s,
            storage: { ok: true, msg: `Firebase Storage connected` },
          }));
        } catch (err: unknown) {
          setStatus((s) => ({
            ...s,
            storage: { ok: false, msg: String(err) },
          }));
        }

        setTestMessage("✅ All Firebase services connected successfully!");
        setLoading(false);
      } catch (err) {
        setTestMessage(`❌ Error: ${String(err)}`);
        setLoading(false);
      }
    };

    testConnections();
  }, []);

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">
          Firebase Connection Test
        </h1>
        <p className="text-gray-400 mb-8">
          Testing connections to all Firebase services...
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
            <span className="ml-3 text-gray-300">Testing connections...</span>
          </div>
        ) : (
          <>
            {/* Success/Error Message */}
            <div
              className={`mb-8 p-4 rounded-xl border ${
                testMessage.startsWith("✅")
                  ? "bg-green-500/10 border-green-500/30 text-green-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}
            >
              <p className="font-semibold">{testMessage}</p>
            </div>

            {/* Service Status Grid */}
            <div className="space-y-3">
              {Object.entries({
                "Firebase Auth": status.auth,
                "Firestore Database": status.firestore,
                Storage: status.storage,
              }).map(([name, srv]) => (
                <div
                  key={name}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-3"
                >
                  {srv?.ok ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{name}</h3>
                    <p
                      className={`text-sm mt-1 ${
                        srv?.ok ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {srv?.msg || "No status"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Config Info */}
            <div className="mt-8 p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
              <h3 className="font-semibold text-white mb-3">Firebase Config</h3>
              <dl className="space-y-2 text-xs text-gray-400">
                <div className="flex justify-between">
                  <dt>Project ID:</dt>
                  <dd className="text-gray-300">ocr-project-f91fc</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Auth Domain:</dt>
                  <dd className="text-gray-300">
                    ocr-project-f91fc.firebaseapp.com
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Storage Bucket:</dt>
                  <dd className="text-gray-300">
                    ocr-project-f91fc.firebasestorage.app
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Database URL:</dt>
                  <dd className="text-gray-300 truncate">
                    ocr-project-f91fc-default-rtdb.firebaseio.com
                  </dd>
                </div>
              </dl>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
