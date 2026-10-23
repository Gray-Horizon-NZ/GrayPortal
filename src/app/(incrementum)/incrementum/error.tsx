"use client";
import Link from "next/link";

export default function IncrementumError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const forbidden = /Forbidden/.test(error.message);
  const missingTables = /relation "incrementum_|does not exist/.test(error.message);
  return (
    <div className="screen">
      <div className="pagehead">
        <div>
          <h1>{forbidden ? "Admin only" : missingTables ? "Database not set up yet" : "Something went wrong"}</h1>
          <p className="sub">Project Incrementum</p>
        </div>
      </div>
      <section className="panel" style={{ maxWidth: 640 }}>
        <div className="panel-pad">
          <p className="desc">
            {forbidden
              ? "Project Incrementum holds commercial data, so it's only available to admins."
              : missingTables
                ? "A database change hasn't been applied yet. Paste the latest db/APPLY-incrementum-*.sql file into Neon's SQL editor, then reload."
                : error.message}
          </p>
          <div className="row" style={{ marginTop: 14 }}>
            {!forbidden && (
              <button className="btn btn-primary" onClick={reset}>
                Try again
              </button>
            )}
            <Link href="/" className="btn">
              Back to Gray Portal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
