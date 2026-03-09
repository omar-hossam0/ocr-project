import Link from "next/link";
import {
  FileText,
  MapPin,
  Calendar,
  User,
  Tag,
  Download,
  Edit3,
  ArrowLeft,
  Clock,
  Building2,
  Bell,
} from "lucide-react";

export default function FileDetailsPage() {
  const file = {
    id: 1,
    name: "Contract_2026_Q1.pdf",
    location: "Cabinet A - Drawer 3",
    department: "Legal",
    dateAdded: "March 8, 2026",
    dateModified: "March 9, 2026",
    addedBy: "Omar Ahmed",
    modifiedBy: "Sara Hassan",
    type: "PDF",
    tags: ["contract", "legal", "Q1", "2026"],
    notes: "Important quarterly contract - needs review before end of March.",
    ocrText: `CONFIDENTIAL

CONTRACT AGREEMENT - Q1 2026

This agreement ("Agreement") is entered into as of January 1, 2026, by and between:

Party A: DocuMind Technologies LLC
Address: Building 5, Floor 3, Business District
Registration No: CR-12345

AND

Party B: Global Services Corporation  
Address: Tower 8, Suite 200, Financial Center
Registration No: CR-67890

TERMS AND CONDITIONS:

1. SCOPE OF SERVICES
Party B agrees to provide document management and archiving services as outlined in Appendix A. All services shall comply with local regulations and international standards.

2. DURATION
This agreement shall remain effective from January 1, 2026, until December 31, 2026, unless terminated earlier in accordance with Section 4.

3. COMPENSATION
Total contract value: 150,000 SAR, payable in quarterly installments of 37,500 SAR each. Payment shall be made within 30 days of invoice receipt.

4. TERMINATION
Either party may terminate this agreement with 60 days written notice. In case of material breach, the non-breaching party may terminate immediately upon written notice.

5. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of all proprietary information shared during the term of this agreement.

Signed and agreed by authorized representatives of both parties.`,
  };

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <Link
          href="/search"
          className="p-2 rounded-xl hover:bg-white/10 transition"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{file.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            File Details & OCR Text
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition">
            <Edit3 className="w-4 h-4" />
            <span className="hidden sm:inline">Edit</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/15 transition">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Follow</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* File Info */}
        <div className="space-y-6">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6 space-y-5">
            <h2 className="font-semibold text-white">File Information</h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Physical Location</p>
                  <p className="text-sm font-medium text-white">
                    {file.location}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Department</p>
                  <p className="text-sm font-medium text-white">
                    {file.department}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Date Added</p>
                  <p className="text-sm font-medium text-white">
                    {file.dateAdded}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Last Modified</p>
                  <p className="text-sm font-medium text-white">
                    {file.dateModified}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Added By</p>
                  <p className="text-sm font-medium text-white">
                    {file.addedBy}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Modified By</p>
                  <p className="text-sm font-medium text-white">
                    {file.modifiedBy}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">File Type</p>
                  <span className="text-xs bg-white/10 text-gray-400 px-2 py-0.5 rounded-full">
                    {file.type}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {file.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-sky-500/20 text-sky-400 px-3 py-1 rounded-full text-xs font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-6">
            <h2 className="font-semibold text-amber-300 text-sm mb-2">Notes</h2>
            <p className="text-sm text-amber-200/80">{file.notes}</p>
          </div>
        </div>

        {/* OCR Full Text */}
        <div className="lg:col-span-2">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">OCR Extracted Text</h2>
              <button className="text-xs text-sky-400 hover:text-sky-300 font-medium">
                Copy Text
              </button>
            </div>
            <div className="bg-black/30 rounded-xl p-6 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto font-mono border border-white/10">
              {file.ocrText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
