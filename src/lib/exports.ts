import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import type { CvExport, ExportSummary, RenderDoc } from "./types";

const EXPORT_DIR = path.join(process.cwd(), "data", "exports");

const SUMMARY_COLUMNS = `id, cv_id, cv_name, company, role, file_name, byte_size,
  page_count, doc_hash, created_at, last_downloaded_at, download_count`;

function exportPath(storedName: string): string {
  return path.join(EXPORT_DIR, storedName);
}

/**
 * File on disk, metadata in SQLite. PDFs are a poor fit for a BLOB column, and
 * keeping them as files means you can also just open data/exports yourself.
 */
export function recordExport(args: {
  cvId: number;
  cvName: string;
  company: string;
  role: string;
  fileName: string;
  pdf: Uint8Array;
  pageCount: number;
  doc: RenderDoc;
}): ExportSummary {
  const conn = db();
  const docJson = JSON.stringify(args.doc);
  const docHash = crypto.createHash("sha256").update(docJson).digest("hex");

  // Re-downloading an unchanged CV should not pile up identical rows; it is
  // the same version, downloaded again.
  const latest = conn
    .prepare(
      "SELECT * FROM cv_export WHERE cv_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    )
    .get(args.cvId) as CvExport | undefined;

  if (latest && latest.doc_hash === docHash) {
    conn
      .prepare(
        `UPDATE cv_export
         SET download_count = download_count + 1,
             last_downloaded_at = datetime('now'),
             file_name = ?
         WHERE id = ?`,
      )
      .run(args.fileName, latest.id);
    // The stored file may have been deleted from disk out from under us.
    if (!fs.existsSync(exportPath(latest.stored_name))) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
      fs.writeFileSync(exportPath(latest.stored_name), args.pdf);
    }
    return getExport(latest.id)!;
  }

  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  const storedName = `${new Date().toISOString().slice(0, 10)}-${docHash.slice(0, 10)}.pdf`;
  fs.writeFileSync(exportPath(storedName), args.pdf);

  const id = conn
    .prepare(
      `INSERT INTO cv_export
        (cv_id, cv_name, company, role, file_name, stored_name, byte_size,
         page_count, doc_hash, doc_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      args.cvId,
      args.cvName,
      args.company,
      args.role,
      args.fileName,
      storedName,
      args.pdf.byteLength,
      args.pageCount,
      docHash,
      docJson,
    ).lastInsertRowid;

  return getExport(Number(id))!;
}

export function listExports(cvId: number): ExportSummary[] {
  return db()
    .prepare(
      `SELECT ${SUMMARY_COLUMNS} FROM cv_export
       WHERE cv_id = ? ORDER BY created_at DESC, id DESC`,
    )
    .all(cvId) as ExportSummary[];
}

export function countExports(cvId: number): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM cv_export WHERE cv_id = ?")
    .get(cvId) as { n: number };
  return row.n;
}

export function getExport(id: number): ExportSummary | undefined {
  return db()
    .prepare(`SELECT ${SUMMARY_COLUMNS} FROM cv_export WHERE id = ?`)
    .get(id) as ExportSummary | undefined;
}

/** The stored file, or null if the row or the file is gone. */
export function readExportFile(
  id: number,
): { fileName: string; bytes: Buffer } | null {
  const row = db()
    .prepare("SELECT file_name, stored_name FROM cv_export WHERE id = ?")
    .get(id) as { file_name: string; stored_name: string } | undefined;
  if (!row) return null;
  const filePath = exportPath(row.stored_name);
  if (!fs.existsSync(filePath)) return null;
  return { fileName: row.file_name, bytes: fs.readFileSync(filePath) };
}

/** The document exactly as it was printed, for showing what a version said. */
export function readExportDoc(id: number): RenderDoc | null {
  const row = db()
    .prepare("SELECT doc_json FROM cv_export WHERE id = ?")
    .get(id) as { doc_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.doc_json) as RenderDoc;
  } catch {
    return null;
  }
}

export function removeExport(id: number): void {
  const conn = db();
  const row = conn
    .prepare("SELECT stored_name FROM cv_export WHERE id = ?")
    .get(id) as { stored_name: string } | undefined;
  if (!row) return;

  conn.prepare("DELETE FROM cv_export WHERE id = ?").run(id);

  // Two rows can share a file when an unchanged CV was re-exported, so only
  // delete the file once nothing points at it.
  const stillUsed = conn
    .prepare("SELECT COUNT(*) AS n FROM cv_export WHERE stored_name = ?")
    .get(row.stored_name) as { n: number };
  if (stillUsed.n === 0) {
    fs.rmSync(exportPath(row.stored_name), { force: true });
  }
}
