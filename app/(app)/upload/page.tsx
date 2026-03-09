"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Camera,
  FileText,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { uploadFileToStorage, addFile } from "@/app/lib/firestore";

export default function UploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [location, setLocation] = useState("Cabinet A - Drawer 1");
  const [department, setDepartment] = useState("Legal");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [ocrResult, setOcrResult] = useState("");
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selected: File) => {
    setFile(selected);
    setFileName(selected.name.replace(/\.[^.]+$/, ""));
    setOcrResult("");
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setProcessing(true);
    try {
      // Simulate OCR processing
      setTimeout(() => {
        setOcrResult(
          "This is a sample extracted text from the uploaded document. The OCR engine has successfully recognized all text content including headers, paragraphs, and structured data. Document ID: DOC-2026-0384. Date: March 9, 2026. Department: Legal Affairs. The document contains important contract information that has been extracted and organized for easy searching and reference.",
        );
        setProcessing(false);
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error processing file";
      setError(errorMessage);
      setProcessing(false);
    }
  };

  const handlePublish = async () => {
    if (!file || !user) {
      setError("Missing file or user");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess(false);

    try {
      // Upload file to Firebase Storage
      const { url } = await uploadFileToStorage(
        file,
        user.uid,
        fileName || file.name,
      );

      // Save file metadata to Firestore
      await addFile({
        name: fileName || file.name,
        originalName: file.name,
        location,
        department,
        fileType: file.type,
        uploadedBy: user.email || "",
        modifiedBy: user.email || "",
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes,
        ocrText: ocrResult,
        storageUrl: url,
        fileSize: file.size,
        uploadedAt: new Date(),
        modifiedAt: new Date(),
      });

      // Show success message
      setSuccess(true);
      console.log(
        `✓ File "${fileName || file.name}" uploaded successfully to ${location} (${department})`,
      );

      // Redirect after 2 seconds so user sees the success message
      setTimeout(() => {
        setFile(null);
        setOcrResult("");
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error uploading file";
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Document</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload paper or digital files and convert them to searchable text
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload area + form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Drop zone */}
          <div
            className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
              dragActive
                ? "border-sky-400 bg-sky-500/10"
                : file
                  ? "border-green-500/50 bg-green-500/10"
                  : "border-white/20 bg-white/5 hover:border-white/30 backdrop-blur-sm"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = e.dataTransfer.files?.[0];
              if (dropped) handleFileSelect(dropped);
            }}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setOcrResult("");
                  }}
                  className="ml-4 p-1.5 hover:bg-white/10 rounded-lg"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                <p className="text-white font-medium text-lg">
                  Drop your documents here
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  PDF, DOCX, JPG, PNG up to 50MB
                </p>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-sky-400 hover:bg-sky-500 text-white px-6 py-2.5 rounded-full text-sm font-medium transition"
                  >
                    Browse Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(f);
                    }}
                  />
                  <button className="border border-white/20 text-gray-300 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-white/10 transition flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    Scan
                  </button>
                </div>
              </>
            )}
          </div>

          {/* File details form */}
          <div className="glass-card p-6 space-y-5">
            <h2 className="font-semibold text-white">File Details</h2>

            {success && (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <div>
                  <p className="font-medium">File uploaded successfully!</p>
                  <p className="text-xs opacity-90 mt-0.5">
                    {fileName || file?.name} saved to {location} • Department:{" "}
                    {department}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                File Name
              </label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Enter file name"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Storage Location
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition appearance-none"
                  >
                    <option>Cabinet A - Drawer 1</option>
                    <option>Cabinet A - Drawer 2</option>
                    <option>Cabinet A - Drawer 3</option>
                    <option>Cabinet B - Drawer 1</option>
                    <option>Office 1 - Shelf A</option>
                    <option>Office 2 - Shelf B</option>
                    <option>Storage Room 1</option>
                    <option>Storage Room 2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Department
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/15 bg-[#0a0f1e] text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition appearance-none"
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

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Tags
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="contract, legal, urgent..."
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="Add any notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-white/15 bg-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/50 transition"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleUpload}
                disabled={!file || processing}
                className="flex-1 sm:flex-none bg-sky-500 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing OCR...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & OCR
                  </>
                )}
              </button>
              <button
                onClick={handlePublish}
                disabled={!ocrResult || uploading}
                className="flex-1 sm:flex-none bg-gray-800 border border-white/15 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Publish
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* OCR Result sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="font-semibold text-white mb-4">
              OCR Extracted Text
            </h2>
            {ocrResult ? (
              <div className="bg-white/5 rounded-xl p-4 text-sm text-gray-300 leading-relaxed max-h-80 overflow-y-auto">
                {ocrResult}
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl p-8 text-center">
                <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Upload a file and click &quot;Upload & OCR&quot; to extract
                  text
                </p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="bg-sky-500/10 rounded-2xl p-6 border border-sky-500/20">
            <h3 className="font-semibold text-sky-300 text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Tips for best OCR results
            </h3>
            <ul className="space-y-2 text-sm text-sky-400/80">
              <li>• Use high-resolution scans (300 DPI+)</li>
              <li>• Ensure text is clearly visible</li>
              <li>• Avoid blurry or tilted images</li>
              <li>• Supported: PDF, DOCX, JPG, PNG</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
