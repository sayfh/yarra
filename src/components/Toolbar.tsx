"use client";

import { useRef, useState } from "react";
import type { Deal } from "@/lib/types";

interface ValidationRow {
  key: string;
  label: string;
  cell: string;
  excelValue: number | null;
  engineValue: number;
  absDiff: number;
  relDiff: number;
  tolerance: number;
  status: "match" | "tolerable" | "mismatch" | "missing";
}

interface ValidationReport {
  rows: ValidationRow[];
  summary: { matched: number; tolerable: number; mismatched: number; missing: number };
}

interface Props {
  onDealLoaded: (d: Deal) => void;
  onReset: () => void;
}

export default function Toolbar({ onDealLoaded, onReset }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const validateInputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<"upload" | "validate" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("upload");
    setError(null);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-excel", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(j.error ?? "Upload failed");
      }
      const data = await res.json();
      onDealLoaded(data.deal as Deal);
      setMessage(
        `Loaded ${file.name}: ${data.stats.cellsRead} cells read` +
        (data.stats.missingCount ? `, ${data.stats.missingCount} missing` : ""),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onValidateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy("validate");
    setError(null);
    setMessage(null);
    setReport(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/validate", { method: "POST", body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(j.error ?? "Validation failed");
      }
      const data = await res.json();
      setReport(data.report as ValidationReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
      if (validateInputRef.current) validateInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={onUploadChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy !== null}
          className="rounded border border-rule px-2 py-0.5 hover:border-ink disabled:opacity-40"
        >
          {busy === "upload" ? "Parsing…" : "Upload .xlsx"}
        </button>

        <input
          ref={validateInputRef}
          type="file"
          accept=".xlsx"
          onChange={onValidateChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => validateInputRef.current?.click()}
          disabled={busy !== null}
          className="rounded border border-rule px-2 py-0.5 hover:border-ink disabled:opacity-40"
        >
          {busy === "validate" ? "Validating…" : "Validate template"}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="rounded border border-rule px-2 py-0.5 hover:border-ink"
        >
          Reset to seed
        </button>

        {message && <span className="text-muted">{message}</span>}
        {error && <span className="text-red-700">{error}</span>}
      </div>

      {report && <ValidationPanel report={report} onClose={() => setReport(null)} />}
    </div>
  );
}

function ValidationPanel({ report, onClose }: { report: ValidationReport; onClose: () => void }) {
  return (
    <div className="rounded-md border border-rule bg-white p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">Validation report</span>
        <button onClick={onClose} className="text-muted hover:text-ink" type="button">
          Close
        </button>
      </div>
      <div className="mb-2 flex gap-3 text-[11px]">
        <Pill kind="match" n={report.summary.matched} />
        <Pill kind="tolerable" n={report.summary.tolerable} />
        <Pill kind="mismatch" n={report.summary.mismatched} />
        <Pill kind="missing" n={report.summary.missing} />
      </div>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wider text-muted">
            <tr className="border-b border-rule">
              <th className="py-1 text-left">Metric</th>
              <th className="py-1 text-right">Excel</th>
              <th className="py-1 text-right">Engine</th>
              <th className="py-1 text-right">Δ%</th>
              <th className="py-1 text-left">Cell</th>
            </tr>
          </thead>
          <tbody className="num">
            {report.rows.map((r) => (
              <tr key={r.key} className="border-b border-rule">
                <td className="py-1 text-left">
                  <StatusDot status={r.status} /> {r.label}
                </td>
                <td className="py-1 text-right">{r.excelValue == null ? "—" : fmtCompact(r.excelValue)}</td>
                <td className="py-1 text-right">{fmtCompact(r.engineValue)}</td>
                <td className="py-1 text-right">
                  {r.excelValue == null ? "—" : `${(r.relDiff * 100).toFixed(2)}%`}
                </td>
                <td className="py-1 text-left text-[10px] text-muted">{r.cell}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pill({ kind, n }: { kind: "match" | "tolerable" | "mismatch" | "missing"; n: number }) {
  const colors = {
    match: "bg-emerald-50 text-emerald-800 border-emerald-200",
    tolerable: "bg-amber-50 text-amber-800 border-amber-200",
    mismatch: "bg-red-50 text-red-800 border-red-200",
    missing: "bg-gray-50 text-gray-700 border-gray-200",
  } as const;
  return <span className={`rounded border px-2 py-0.5 ${colors[kind]}`}>{n} {kind}</span>;
}

function StatusDot({ status }: { status: "match" | "tolerable" | "mismatch" | "missing" }) {
  const c = {
    match: "bg-emerald-500",
    tolerable: "bg-amber-500",
    mismatch: "bg-red-500",
    missing: "bg-gray-400",
  }[status];
  return <span className={`mr-1 inline-block h-2 w-2 rounded-full ${c}`} />;
}

function fmtCompact(n: number): string {
  if (!isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Math.abs(n) >= 1) return n.toFixed(0);
  return n.toFixed(4);
}
