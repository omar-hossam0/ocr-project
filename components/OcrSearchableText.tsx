"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";

type OcrSearchableTextProps = {
  text: string;
  emptyMessage?: string;
  textContainerClassName?: string;
  inputPlaceholder?: string;
};

type MatchRange = {
  start: number;
  end: number;
};

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function OcrSearchableText({
  text,
  emptyMessage = "(No text detected by OCR)",
  textContainerClassName = "bg-white/5 rounded-xl p-4 text-sm text-gray-300 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap",
  inputPlaceholder = "Search in OCR text...",
}: OcrSearchableTextProps) {
  const [query, setQuery] = useState("");
  const [manualMatchIndex, setManualMatchIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = query.trim();

  const matches = useMemo<MatchRange[]>(() => {
    if (!text || !normalizedQuery) {
      return [];
    }

    const regex = new RegExp(escapeRegex(normalizedQuery), "gi");
    const nextMatches: MatchRange[] = [];
    let currentMatch = regex.exec(text);

    while (currentMatch) {
      const start = currentMatch.index;
      const value = currentMatch[0] || "";
      nextMatches.push({
        start,
        end: start + value.length,
      });

      // Guard against zero-length matches.
      if (value.length === 0) {
        regex.lastIndex += 1;
      }

      currentMatch = regex.exec(text);
    }

    return nextMatches;
  }, [text, normalizedQuery]);

  const activeMatchIndex =
    matches.length > 0 ? Math.min(manualMatchIndex, matches.length - 1) : -1;

  useEffect(() => {
    if (activeMatchIndex < 0) {
      return;
    }

    const current = containerRef.current?.querySelector<HTMLElement>(
      `[data-ocr-match-index="${activeMatchIndex}"]`,
    );
    if (!current) {
      return;
    }

    current.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeMatchIndex]);

  const goToPrevious = () => {
    if (!matches.length) return;
    setManualMatchIndex((prev) => (prev <= 0 ? matches.length - 1 : prev - 1));
  };

  const goToNext = () => {
    if (!matches.length) return;
    setManualMatchIndex((prev) => (prev >= matches.length - 1 ? 0 : prev + 1));
  };

  const renderTextWithHighlights = () => {
    if (!text) {
      return <span>{emptyMessage}</span>;
    }

    if (!normalizedQuery || !matches.length) {
      return <span>{text}</span>;
    }

    const nodes: React.ReactNode[] = [];
    let cursor = 0;

    matches.forEach((match, i) => {
      if (match.start > cursor) {
        nodes.push(
          <span key={`text-${cursor}-${match.start}`}>
            {text.slice(cursor, match.start)}
          </span>,
        );
      }

      const isActive = i === activeMatchIndex;
      nodes.push(
        <mark
          key={`match-${match.start}-${match.end}-${i}`}
          data-ocr-match-index={i}
          className={
            isActive
              ? "rounded bg-orange-300 px-0.5 text-black"
              : "rounded bg-amber-200/90 px-0.5 text-black"
          }
        >
          {text.slice(match.start, match.end)}
        </mark>,
      );

      cursor = match.end;
    });

    if (cursor < text.length) {
      nodes.push(<span key={`text-tail-${cursor}`}>{text.slice(cursor)}</span>);
    }

    return nodes;
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-white/5 p-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setManualMatchIndex(0);
              }}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (event.shiftKey) {
                  goToPrevious();
                } else {
                  goToNext();
                }
              }}
              placeholder={inputPlaceholder}
              className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 outline-none transition focus:border-sky-500/50"
            />
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-xs text-gray-400 min-w-[78px] text-right">
              {matches.length
                ? `${activeMatchIndex + 1}/${matches.length}`
                : "0/0"}
            </span>
            <button
              type="button"
              onClick={goToPrevious}
              disabled={!matches.length}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous match"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              disabled={!matches.length}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next match"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {normalizedQuery && !matches.length && text && (
          <p className="mt-2 text-xs text-rose-300">
            No matches found for &quot;{normalizedQuery}&quot;
          </p>
        )}
      </div>

      <div ref={containerRef} className={textContainerClassName}>
        {renderTextWithHighlights()}
      </div>
    </div>
  );
}
