"use client";

import { useState, useTransition } from "react";
import { deleteExport, getExports } from "@/lib/actions";
import { ConfirmButton } from "@/components/ui";
import type { ExportSummary } from "@/lib/types";

/** Archive of every PDF this CV has produced, newest first. */
export function VersionList({
  cvId,
  exports,
  onChange,
}: {
  cvId: number;
  exports: ExportSummary[];
  onChange: (next: ExportSummary[]) => void;
}) {
  const [, startTransition] = useTransition();

  if (exports.length === 0) {
    return (
      <div className="card px-5 py-8 text-center">
        <p className="text-[13.5px] font-medium">No versions saved yet</p>
        <p className="mt-1 text-[13px] muted">
          Every PDF you download is kept here, with a snapshot of what it said.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2">
      {exports.map((item) => (
        <li key={item.id} className="card px-3.5 py-3">
          <div className="flex items-baseline gap-3">
            <span className="text-[13.5px] font-medium">
              {formatStamp(item.created_at)}
            </span>
            {item.download_count > 1 && (
              <span className="text-[12px] muted">
                downloaded {item.download_count}× · last{" "}
                {formatStamp(item.last_downloaded_at)}
              </span>
            )}
          </div>

          <p className="mt-0.5 truncate text-[12.5px] muted">
            {[item.role, item.company].filter(Boolean).join(" · ") || item.cv_name}
            <span className="mx-2 text-line">|</span>
            {item.page_count} {item.page_count === 1 ? "page" : "pages"}
            <span className="mx-2 text-line">|</span>
            {formatSize(item.byte_size)}
          </p>

          <div className="mt-2 flex items-center gap-1.5">
            <a className="btn btn-sm" href={`/api/exports/${item.id}`}>
              Download
            </a>
            <a
              className="btn btn-ghost btn-sm"
              href={`/print/export/${item.id}`}
              target="_blank"
              rel="noreferrer"
            >
              View
            </a>
            <div className="ml-auto">
              <ConfirmButton
                onConfirm={() =>
                  startTransition(async () => {
                    onChange(await deleteExport(item.id, cvId));
                  })
                }
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Downloads the PDF via fetch so the archive can refresh straight away. */
export function useDownload(cvId: number, onSaved: (next: ExportSummary[]) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/cv/${cvId}/pdf`);
      if (!response.ok) {
        throw new Error(
          (await response.text()).slice(0, 200) || `Export failed (${response.status})`,
        );
      }
      const blob = await response.blob();
      const name =
        response.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] ?? "CV.pdf";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      onSaved(await getExports(cvId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return { download, busy, error };
}

function formatStamp(sqlDate: string): string {
  const date = new Date(sqlDate.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return sqlDate;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
