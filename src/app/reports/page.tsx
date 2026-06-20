import Navbar from "@/components/Navbar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getReports, type SavedReport } from "@/app/actions/reports";
import ReportCard from "@/components/ReportCard";
import styles from "./reports.module.css";

export const metadata = {
  title: "AI Reports · HeliumTrader",
  description: "AI-generated backtest analyses and end-of-day paper trading reviews.",
};

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function buildSummary(reports: SavedReport[]) {
  const backtests = reports.filter((r) => r.kind === "backtest").length;
  const eod = reports.filter((r) => r.kind === "eod").length;

  const winRates = reports
    .map((r) => num(r.metrics?.winRate))
    .filter((v): v is number => v != null);
  const avgWinRate = winRates.length
    ? winRates.reduce((a, b) => a + b, 0) / winRates.length
    : null;

  const returns = reports
    .map((r) => num(r.metrics?.totalReturn) ?? num(r.metrics?.returnPct))
    .filter((v): v is number => v != null);
  const bestReturn = returns.length ? Math.max(...returns) : null;

  return [
    {
      label: "Reports generated",
      value: String(reports.length),
      sub: `${backtests} backtest · ${eod} end-of-day`,
      tone: "neutral" as const,
    },
    {
      label: "Avg win rate",
      value: avgWinRate != null ? `${avgWinRate.toFixed(1)}%` : "—",
      sub: avgWinRate != null ? `Across ${winRates.length} report${winRates.length === 1 ? "" : "s"}` : "No data yet",
      tone: avgWinRate != null && avgWinRate >= 50 ? ("profit" as const) : ("neutral" as const),
    },
    {
      label: "Best return",
      value: bestReturn != null ? `${bestReturn >= 0 ? "+" : ""}${bestReturn.toFixed(2)}%` : "—",
      sub: "Top recorded result",
      tone: bestReturn != null && bestReturn >= 0 ? ("profit" as const) : ("neutral" as const),
    },
  ];
}

export default async function ReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const reports = await getReports();
  const summary = buildSummary(reports);

  return (
    <>
      <Navbar />
      <main className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>Reports</p>
            <h1 className={styles.title}>AI trading reports</h1>
            <p className={styles.subtitle}>
              Performance analysis with actionable insights. Reports are generated from your
              real backtests and paper trading sessions, then saved to your account.
            </p>
          </header>

          {reports.length > 0 ? (
            <>
              <section className={styles.summaryGrid}>
                {summary.map((s) => (
                  <div className={styles.summaryCard} key={s.label}>
                    <span className={styles.summaryLabel}>{s.label}</span>
                    <span className={`${styles.summaryValue} ${s.tone === "profit" ? "profit" : ""}`}>
                      {s.value}
                    </span>
                    <span className={styles.summarySub}>{s.sub}</span>
                  </div>
                ))}
              </section>

              <section className={styles.reportList}>
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </section>
            </>
          ) : (
            <div className={styles.emptyState}>
              <h2 className={styles.emptyTitle}>No reports yet</h2>
              <p className={styles.emptyText}>
                Run a backtest on the dashboard or finish a paper trading session, then generate
                an AI report. It will be saved here automatically.
              </p>
              <div className={styles.reportTags} style={{ justifyContent: "center" }}>
                <Link href="/dashboard" className="btn btn-primary">
                  Run a backtest
                </Link>
                <Link href="/paper" className="btn btn-secondary">
                  Paper trade
                </Link>
              </div>
            </div>
          )}

          <section className={styles.cta}>
            <h2 className={styles.ctaTitle}>Generate more reports</h2>
            <p className={styles.ctaText}>
              Run a simulation or paper trade to generate a new AI performance report.
            </p>
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Run a simulation
            </Link>
          </section>
        </div>
      </main>
    </>
  );
}
