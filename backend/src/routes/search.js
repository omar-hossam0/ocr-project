import express from "express";
import { getDb } from "../db.js";

const router = express.Router();

function buildOcrPreview(ocrText, keyword, maxLength) {
  if (!ocrText) return "";

  const source = String(ocrText).replace(/\s+/g, " ").trim();
  if (!source) return "";

  const lowerText = source.toLowerCase();
  const lowerKeyword = String(keyword || "").toLowerCase().trim();
  const index = lowerKeyword ? lowerText.indexOf(lowerKeyword) : -1;

  if (index === -1) {
    return source.slice(0, maxLength);
  }

  const halfWindow = Math.floor(maxLength / 2);
  const start = Math.max(0, index - halfWindow);
  const end = Math.min(source.length, start + maxLength);
  const snippet = source.slice(start, end);

  const prefix = start > 0 ? "..." : "";
  const suffix = end < source.length ? "..." : "";
  return `${prefix}${snippet}${suffix}`;
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  try {
    const keyword = req.query.q ? String(req.query.q) : "";
    const department = req.query.department ? String(req.query.department) : "";
    const limit = Number(req.query.limit || 50);
    const previewLength = Number(req.query.previewLength || 120);

    if (!keyword && !department) {
      return res.status(400).json({
        success: false,
        error: "Please provide 'q' (search keyword) or 'department' parameter",
      });
    }

    const db = getDb();
    let results = [];

    if (department) {
      const files = await db
        .collection("files")
        .find({ department })
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .toArray();

      results = files.map((file) => ({
        id: file._id.toString(),
        fileName: file.name || "",
        documentType: file.documentType || file.fileType || "Unknown",
        physicalLocation: file.physicalLocation || file.location || "Unknown",
        ocrPreview: String(file.ocrText || "").slice(0, previewLength),
        matchField: "ocrText",
      }));
    } else if (keyword) {
      const regex = new RegExp(escapeRegex(keyword), "i");
      const files = await db
        .collection("files")
        .find({
          $or: [
            { name: regex },
            { ocrText: regex },
            { physicalLocation: regex },
            { location: regex },
            { documentType: regex },
            { tags: regex },
          ],
        })
        .sort({ uploadedAt: -1 })
        .limit(limit)
        .toArray();

      results = files.map((file) => {
        const name = file.name || "";
        const ocrText = file.ocrText || "";
        const location = file.physicalLocation || file.location || "Unknown";
        const documentType = file.documentType || file.fileType || "Unknown";
        const tags = Array.isArray(file.tags) ? file.tags : [];
        const lowerKeyword = keyword.toLowerCase();

        let matchField = "ocrText";
        if (name.toLowerCase().includes(lowerKeyword)) {
          matchField = "name";
        } else if (location.toLowerCase().includes(lowerKeyword)) {
          matchField = "location";
        } else if (documentType.toLowerCase().includes(lowerKeyword)) {
          matchField = "documentType";
        } else if (tags.some((tag) => String(tag).toLowerCase().includes(lowerKeyword))) {
          matchField = "tags";
        }

        return {
          id: file._id.toString(),
          fileName: name,
          documentType,
          physicalLocation: location,
          ocrPreview: buildOcrPreview(ocrText, keyword, previewLength),
          matchField,
        };
      });
    }

    return res.json({
      success: true,
      query: keyword || department,
      data: results,
      count: results.length,
      searchableColumns: [
        "name",
        "ocrText",
        "documentType",
        "physicalLocation",
        "tags",
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return res.status(500).json({ success: false, error: message });
  }
});

export default router;
