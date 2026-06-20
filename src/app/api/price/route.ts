import { NextResponse } from "next/server";
import { fetchTicker } from "@/lib/bybit";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export const dynamic = "force-dynamic";

// Live price quotes for the paper-trading engine.
// GET /api/price?market=crypto&symbols=BTCUSDT,ETHUSDT
// GET /api/price?market=stock&symbols=AAPL,MSFT
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = (searchParams.get("market") || "stock").trim();
  const symbolsParam = (searchParams.get("symbols") || "").trim();
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 25);

  if (symbols.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  try {
    const prices: Record<string, number> = {};

    if (market === "crypto") {
      const tickers = await Promise.all(
        symbols.map((s) => fetchTicker(s).catch(() => null))
      );
      tickers.forEach((t, i) => {
        if (t && t.price > 0) prices[symbols[i]] = t.price;
      });
    } else {
      const quotes = await yahooFinance.quote(symbols);
      const list = Array.isArray(quotes) ? quotes : [quotes];
      for (const q of list) {
        const p = q.regularMarketPrice;
        if (q.symbol && typeof p === "number") {
          prices[q.symbol.toUpperCase()] = p;
        }
      }
    }

    return NextResponse.json({ prices });
  } catch (err) {
    console.log("[v0] price fetch failed:", (err as Error).message);
    return NextResponse.json({ prices: {}, error: "fetch_failed" }, { status: 502 });
  }
}
