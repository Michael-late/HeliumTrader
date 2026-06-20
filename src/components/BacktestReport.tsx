"use client";

import { useCallback, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { streamReport } from "@/lib/report-stream";
import type { BacktestMetrics } from "@/lib/backtest";
import styles from "./AiReport.module.css";

interface Props {
  symbol: string;
  name: string;
  period: string;
  strategy: string;
  strategyLabel: string;
  metrics: BacktestMetrics;
  tradeCount: number;
}

export default function BacktestReport({
  symbol,
  name,
  period,
  strategy,
  strategyLabel,
  metrics,
  tradeCount,
}: Props) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "streaming" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setContent("");
    setError(null);
    setStatus("streaming");
    try {
      await streamReport(
        "/api/reports/backtest",
        { symbol, name, period, strategy, strategyLabel, metrics, tradeCount },
        setContent,
        controller.signal
      );
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setStatus("error");
    }
  }, [symbol, name, period, strategy, strategyLabel, metrics, tradeCount]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>AI Backtest Report</span>
          <span className="badge badge-accent">{strategyLabel}</span>
        </div>
        {status !== "streaming" && (
          <button className="btn btn-primary btn-sm" onClick={generate}>
            {status === "idle" ? "Generate report" : "Regenerate"}
          </button>
        )}
        {status === "streaming" && (
          <span className={styles.streaming}>
            <span className={styles.dot} />
            Analyzing…
          </span>
        )}
      </div>

      <div className={styles.body}>
        {status === "idle" && (
          <p className={styles.placeholder}>
            Generate an AI-written analysis of this backtest — strengths, risks, and
            concrete parameter adjustments based on the {tradeCount} trade
            {tradeCount === 1 ? "" : "s"} above.
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}
        {content && <Markdown content={content} />}
        {status === "streaming" && !content && (
          <p className={styles.placeholder}>Reading the numbers…</p>
        )}
        {status === "done" && (
          <p className={styles.saved}>Saved to your reports.</p>
        )}
      </div>
    </div>
  );
}
