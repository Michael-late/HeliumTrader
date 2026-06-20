"use client";

import { useCallback, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { streamReport } from "@/lib/report-stream";
import styles from "./AiReport.module.css";

export interface EodPayload {
  market: "stock" | "crypto";
  equity: number;
  cash: number;
  holdingsValue: number;
  startingBalance: number;
  totalPnl: number;
  positions: {
    symbol: string;
    qty: number;
    avgEntry: number;
    mark: number;
    unrealizedPnl: number;
  }[];
  tradeStats: {
    total: number;
    buys: number;
    sells: number;
    realizedPnl: number;
    wins: number;
    losses: number;
    autoTrades: number;
    strategies: string[];
  };
}

interface Props {
  marketLabel: string;
  buildPayload: () => EodPayload;
  disabled?: boolean;
}

export default function EodReview({ marketLabel, buildPayload, disabled }: Props) {
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
      await streamReport("/api/reports/eod", buildPayload(), setContent, controller.signal);
      setStatus("done");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
      setStatus("error");
    }
  }, [buildPayload]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.title}>End-of-Day Review</span>
          <span className="badge badge-accent">{marketLabel}</span>
        </div>
        {status !== "streaming" && (
          <button className="btn btn-primary btn-sm" onClick={generate} disabled={disabled}>
            {status === "idle" ? "Generate review" : "Regenerate"}
          </button>
        )}
        {status === "streaming" && (
          <span className={styles.streaming}>
            <span className={styles.dot} />
            Reviewing…
          </span>
        )}
      </div>

      <div className={styles.body}>
        {status === "idle" && (
          <p className={styles.placeholder}>
            Generate an AI coach&apos;s review of today&apos;s {marketLabel.toLowerCase()} paper
            session — what worked, what to watch, and a plan for tomorrow. Saved to your reports.
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}
        {content && <Markdown content={content} />}
        {status === "streaming" && !content && (
          <p className={styles.placeholder}>Reviewing your session…</p>
        )}
        {status === "done" && <p className={styles.saved}>Saved to your reports.</p>}
      </div>
    </div>
  );
}
