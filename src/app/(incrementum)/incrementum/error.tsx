"use client";
import Link from "next/link";

export default function IncrementumError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = /Forbidden/.test(error.message);
  const missingTables = /relation "incrementum_|does not exist/.test(error.message);
  return (
    <div className="inc-panel" style={{ maxWidth: 640 }}>
      <p className="gh-eyebrow">Project Incrementum</p>
      <h1 className="inc-page-title">{forbidden ? "Admin only" : missingTables ? "Database not set up yet" : "Something went wrong"}</h1>
      <p className="inc-muted">
        {forbidden
          ? "Project Incrementum holds commercial data, so it's only available to admins."
          : missingTables
            ? "Apply db/migrations/0037_incrementum.sql and then db/sql/030_incrementum.sql in Neon's SQL editor, then reload."
            : error.message}
      </p>
      <div className="inc-inline">
        {!forbidden && (
          <button className="gh-btn-primary" onClick={reset}>
            Try again
          </button>
        )}
        <Link href="/" className="gh-btn-secondary">
          Back to Gray Portal
        </Link>
      </div>
    </div>
  );
}
