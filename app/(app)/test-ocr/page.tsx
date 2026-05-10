"use client";
import { useState } from "react";
import { Upload, FileText } from "lucide-react";

export default function TestOCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setOcrResult("");
      setError("");
    }
  };

  const processOCR = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ocr-direct", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setOcrResult(result.data?.text || "No text found");
        console.log("OCR Success:", result.data);
      } else {
        setError(result.error || "OCR failed");
        console.error("OCR Error:", result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Request Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Direct OCR Test (Bypass Storage)
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File (PDF, DOCX, DOC, Images)
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.bmp,.tiff"
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-3"
            />
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>

          <button
            onClick={processOCR}
            disabled={!file || loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-t-2 border-white mr-2"></div>
                Processing OCR...
              </span>
            ) : (
              <span className="flex items-center">
                <FileText className="mr-2" size={20} />
                Extract Text
              </span>
            )}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 font-medium">Error: {error}</p>
            </div>
          )}

          {ocrResult && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                OCR Extracted Text:
              </h2>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {ocrResult}
                </pre>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                Characters extracted: {ocrResult.length}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <a
            href="/upload"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Upload Page
          </a>
        </div>
      </div>
    </div>
  );
}
