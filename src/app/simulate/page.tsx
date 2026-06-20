"use client";

import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import styles from "./simulate.module.css";

type Strategy = "sma_crossover" | "rsi" | "bollinger" | "macd";

const strategyLabels: Record<Strategy, string> = {
  sma_crossover: "SMA Crossover",
  rsi: "RSI",
  bollinger: "Bollinger Bands",
  macd: "MACD",
};

interface SimResult {
  totalReturn: number;
  winRate: number;
  totalTrades: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  equityCurve: number[];
  trades: Array<{ type: "BUY" | "SELL"; price: number; time: string; pnl: number }>;
  aiReport: string;
}

function runMockSimulation(strategy: Strategy): SimResult {
  const equityCurve: number[] = [10000];
  const trades: SimResult["trades"] = [];
  let equity = 10000;

  for (let i = 1; i <= 120; i++) {
    const change = (Math.random() - 0.44) * 150;
    equity = Math.max(equity + change, equity * 0.95);
    equityCurve.push(Math.round(equity * 100) / 100);

    if (i % 8 === 0) {
      const isBuy = Math.random() > 0.5;
      const pnl = (Math.random() - 0.4) * 5;
      trades.push({
        type: isBuy ? "BUY" : "SELL",
        price: 3.5 + Math.random() * 0.8,
        time: `2026-06-${String(14 + Math.floor(i / 20)).padStart(2, "0")} ${String(9 + (i % 8)).padStart(2, "0")}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
        pnl: Math.round(pnl * 100) / 100,
      });
    }
  }

  const finalReturn = ((equity - 10000) / 10000) * 100;
  const wins = trades.filter((t) => t.pnl > 0).length;
  const winPct = Math.round((wins / trades.length) * 100);

  return {
    totalReturn: Math.round(finalReturn * 100) / 100,
    winRate: Math.round((wins / trades.length) * 10000) / 100,
    totalTrades: trades.length,
    sharpeRatio: Math.round((1.2 + Math.random() * 1.2) * 100) / 100,
    maxDrawdown: Math.round((3 + Math.random() * 5) * 100) / 100,
    profitFactor: Math.round((1.1 + Math.random() * 0.8) * 100) / 100,
    avgWin: Math.round((1.5 + Math.random() * 2) * 100) / 100,
    avgLoss: Math.round((0.8 + Math.random() * 1.2) * 100) / 100,
    equityCurve,
    trades,
    aiReport: `**Performance Summary**: Your ${strategyLabels[strategy]} strategy showed a **${finalReturn > 0 ? "positive" : "negative"}** return of **${Math.abs(Math.round(finalReturn * 100) / 100)}%** over the test period.\n\n**Key Observations**:\n• Win rate of ${winPct}% indicates ${wins / trades.length > 0.55 ? "a reliable" : "room for improvement in"} signal generation\n• Maximum drawdown remained controlled, suggesting good risk management\n• The Sharpe ratio indicates risk-adjusted returns above average\n\n**Recommendations**:\n• Consider tightening the stop-loss to reduce max drawdown further\n• The strategy performs best in trending markets — add a trend filter\n• Test with different timeframes to find optimal entry/exit windows`,
  };
}

export default function SimulatePage() {
  const [strategy, setStrategy] = useState<Strategy>("sma_crossover");
  const [pair] = useState("SUI/USDC");
  const [timeframe, setTimeframe] = useState("1H");
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [stopLoss, setStopLoss] = useState(2);
  const [takeProfit, setTakeProfit] = useState(4);

  const handleRun = useCallback(() => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      setResult(runMockSimulation(strategy));
      setLoading(false);
    }, 1600);
  }, [strategy]);

  const renderEquityCurve = (data: number[]) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 100;
    const h = 100;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    });
    const areaPoints = [...points, `${w},${h}`, `0,${h}`];
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className={styles.equitySvg} preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.25)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0)" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints.join(" ")} fill="url(#equityGrad)" />
        <polyline points={points.join(" ")} fill="none" stroke="var(--color-profit)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  };

  const stats = result
    ? [
        { label: "Total Return", value: `${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn}%`, tone: result.totalReturn >= 0 ? "profit" : "loss" },
        { label: "Win Rate", value: `${result.winRate}%`, tone: result.winRate > 50 ? "profit" : "loss" },
        { label: "Sharpe Ratio", value: `${result.sharpeRatio}`, tone: "" },
        { label: "Max Drawdown", value: `-${result.maxDrawdown}%`, tone: "loss" },
        { label: "Total Trades", value: `${result.totalTrades}`, tone: "" },
        { label: "Profit Factor", value: `${result.profitFactor}`, tone: "" },
        { label: "Avg Win", value: `+${result.avgWin}%`, tone: "profit" },
        { label: "Avg Loss", value: `-${result.avgLoss}%`, tone: "loss" },
      ]
    : [];

  return (
    <>
      <Navbar />
      <div className={styles.page}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Backtest</span>
          <h1 className={styles.title}>Simulator</h1>
          <p className={styles.subtitle}>
            Run a strategy against historical data, tune parameters, and review the results.
          </p>
        </header>

        <div className={styles.body}>
          {/* Config */}
          <aside className={styles.config}>
            <div className={styles.configGroup}>
              <label className={styles.label}>Trading pair</label>
              <select className={styles.select} value={pair} disabled>
                <option value="SUI/USDC">SUI / USDC</option>
              </select>
            </div>

            <div className={styles.configGroup}>
              <label className={styles.label}>Timeframe</label>
              <select className={styles.select} value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
                {["1m", "5m", "15m", "1H", "4H", "1D"].map((tf) => (
                  <option key={tf} value={tf}>{tf}</option>
                ))}
              </select>
            </div>

            <div className={styles.configGroup}>
              <label className={styles.label}>Algorithm</label>
              <select className={styles.select} value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
                {Object.entries(strategyLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div className={styles.configGroup}>
              <label className={styles.label}>
                Backtest period <span className={styles.value}>{days}d</span>
              </label>
              <input type="range" className="slider" min="1" max="30" value={days} onChange={(e) => setDays(+e.target.value)} />
            </div>

            <div className={styles.configGroup}>
              <label className={styles.label}>
                Stop loss <span className={styles.value} style={{ color: "var(--color-loss)" }}>{stopLoss}%</span>
              </label>
              <input type="range" className="slider" min="0.5" max="10" step="0.5" value={stopLoss} onChange={(e) => setStopLoss(+e.target.value)} />
            </div>

            <div className={styles.configGroup}>
              <label className={styles.label}>
                Take profit <span className={styles.value} style={{ color: "var(--color-profit)" }}>{takeProfit}%</span>
              </label>
              <input type="range" className="slider" min="1" max="20" step="0.5" value={takeProfit} onChange={(e) => setTakeProfit(+e.target.value)} />
            </div>

            <button className="btn btn-primary" style={{ width: "100%" }} onClick={handleRun} disabled={loading}>
              {loading ? "Running…" : "Run backtest"}
            </button>
          </aside>

          {/* Results */}
          <section className={styles.results}>
            {!result && !loading && (
              <div className={styles.placeholder}>
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <path d="M4 24L12 16L18 21L28 9" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="28" cy="9" r="2" stroke="var(--text-tertiary)" strokeWidth="1.5" />
                </svg>
                <h3 className={styles.placeholderTitle}>Ready to simulate</h3>
                <p className={styles.placeholderText}>
                  Configure your parameters and run a backtest to see performance metrics and an AI analysis.
                </p>
              </div>
            )}

            {loading && (
              <div className={styles.placeholder}>
                <div className={styles.spinner} />
                <h3 className={styles.placeholderTitle}>Running simulation</h3>
                <p className={styles.placeholderText}>
                  {strategyLabels[strategy]} · {pair} · {days} days
                </p>
              </div>
            )}

            {result && !loading && (
              <div className={styles.resultInner}>
                {/* Stats */}
                <div className={styles.statsGrid}>
                  {stats.map((s) => (
                    <div key={s.label} className={styles.stat}>
                      <span className={styles.statLabel}>{s.label}</span>
                      <span className={`${styles.statValue} ${s.tone}`}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Equity curve */}
                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <span className={styles.panelTitle}>Equity curve</span>
                    <span className={`badge ${result.totalReturn >= 0 ? "badge-profit" : "badge-loss"}`}>
                      {result.totalReturn >= 0 ? "+" : ""}{result.totalReturn}%
                    </span>
                  </div>
                  <div className={styles.equityBody}>{renderEquityCurve(result.equityCurve)}</div>
                </div>

                {/* AI report */}
                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <span className={styles.panelTitle}>AI analysis</span>
                    <span className="badge badge-accent">Generated</span>
                  </div>
                  <div className={styles.report}>
                    {result.aiReport.split("\n\n").map((paragraph, i) => (
                      <p key={i}>
                        {paragraph.split("**").map((part, j) =>
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Trades */}
                <div className={styles.panel}>
                  <div className={styles.panelHead}>
                    <span className={styles.panelTitle}>Trade log</span>
                    <span className={styles.panelMeta}>{result.trades.length} trades</span>
                  </div>
                  <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Price</th>
                          <th>Time</th>
                          <th style={{ textAlign: "right" }}>P&amp;L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.trades.map((trade, i) => (
                          <tr key={i}>
                            <td>
                              <span style={{ color: trade.type === "BUY" ? "var(--color-profit)" : "var(--color-loss)", fontWeight: 600 }}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="mono">${trade.price.toFixed(4)}</td>
                            <td className="mono" style={{ color: "var(--text-tertiary)", fontSize: "0.8125rem" }}>{trade.time}</td>
                            <td className="mono" style={{ textAlign: "right", color: trade.pnl >= 0 ? "var(--color-profit)" : "var(--color-loss)", fontWeight: 700 }}>
                              {trade.pnl >= 0 ? "+" : ""}{trade.pnl}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
