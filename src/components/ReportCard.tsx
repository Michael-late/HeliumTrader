"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Markdown from "@/components/Markdown";
import { deleteReport, type SavedReport } from "@/app/actions/reports";
import styles from "@/app/reports/reports.module.css";

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

interface Metric {
  label: string;
  value: string;
  tone: "profit" | "loss" | "neutral";
}

function deriveMetrics(report: SavedReport): Metric[] {
  const m = report.metrics ?? {};
  const out: Metric[] = [];
  const push = (label: string, value: string, tone: Metric["tone"] = "neutral") =>
    out.push({ label, value, tone });

  if (report.kind === "backtest") {
    const ret = num(m.totalReturn);
    if (ret != null) push("Return", `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`, ret >= 0 ? "profit" : "loss");
    const wr = num(m.winRate);
    if (wr != null) push("Win rate", `${wr.toFixed(1)}%`, wr >= 50 ? "profit" : "loss");
    const tt = num(m.totalTrades);
    if (tt != null) push("Trades", String(tt));
    const sharpe = num(m.sharpe);
    if (sharpe != null) push("Sharpe", sharpe.toFixed(2), sharpe >= 1 ? "profit" : "neutral");
  } else {
    const pnl = num(m.totalPnl);
    if (pnl != null)
      push(
        "P&L",
        `${pnl >= 0 ? "+" : ""}${pnl.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`,
        pnl >= 0 ? "profit" : "loss"
      );
    const ret = num(m.returnPct);
    if (ret != null) push("Return", `${ret >= 0 ? "+" : ""}${ret.toFixed(2)}%`, ret >= 0 ? "profit" : "loss");
    const tr = num(m.trades);
    if (tr != null) push("Trades", String(tr));
    const wr = num(m.winRate);
    if (wr != null) push("Win rate", `${wr.toFixed(1)}%`, wr >= 50 ? "profit" : "loss");
  }
  return out;
}

export default function ReportCard({ report }: { report: SavedReport }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const metrics = deriveMetrics(report);
  const date = new Date(report.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const kindLabel = report.kind === "backtest" ? "Backtest" : "End of Day";

  const onDelete = () => {
    startTransition(async () => {
      await deleteReport(report.id);
      router.refresh();
    });
  };

  return (
    <article className={styles.reportCard}>
      <div className={styles.reportHead}>
        <div className={styles.reportHeadLeft}>
          <span className={styles.reportDate}>{date}</span>
          <div className={styles.reportTags}>
            <span className={`${styles.tag} ${styles.kindTag}`}>{kindLabel}</span>
            {report.symbol && <span className={styles.tag}>{report.symbol}</span>}
            {report.strategy && <span className={styles.tag}>{report.title.split("—")[0].trim()}</span>}
          </div>
        </div>
        <button
          className={styles.deleteBtn}
          onClick={onDelete}
          disabled={pending}
          aria-label="Delete report"
          title="Delete report"
        >
          {pending ? "Deleting…" : "Delete"}
        </button>
      </div>

      {metrics.length > 0 && (
        <div className={styles.metricRow}>
          {metrics.map((mt) => (
            <div className={styles.metric} key={mt.label}>
              <span className={styles.metricLabel}>{mt.label}</span>
              <span
                className={`${styles.metricValue} ${mt.tone === "profit" ? "profit" : mt.tone === "loss" ? "loss" : ""}`}
              >
                {mt.value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.reportSection}>
        <h2 className={styles.sectionLabel}>Analysis</h2>
        {expanded ? (
          <Markdown content={report.content} />
        ) : (
          <p className={styles.reportText}>{report.summary || report.content.slice(0, 240)}</p>
        )}
        <button className={styles.toggleBtn} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show less" : "Show full report"}
        </button>
      </div>
    </article>
  );
}
