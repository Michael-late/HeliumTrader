import { NextResponse } from "next/server";
import { fetchKlines, fetchTicker, INTERVAL_MAP } from "@/lib/bybit";

export const revalidate = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  const interval = (searchParams.get("interval") || "1H").trim();
  const limit = Number(searchParams.get("limit") || "200");

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }
  if (!(interval in INTERVAL_MAP)) {
    return NextResponse.json({ error: "Invalid interval" }, { status: 400 });
  }

  try {
    const [candles, ticker] = await Promise.all([
      fetchKlines(symbol, interval, Number.isFinite(limit) ? limit : 200),
      fetchTicker(symbol).catch(() => null),
    ]);

    if (candles.length === 0) {
      return NextResponse.json(
        { error: `No candle data for "${symbol}"` },
        { status: 404 }
      );
    }

    const currentPrice = ticker?.price ?? candles[candles.length - 1].close;

    return NextResponse.json({
      symbol,
      name: ticker?.name ?? symbol,
      currentPrice,
      change: ticker?.change ?? 0,
      interval,
      data: candles,
    });
  } catch (err) {
    console.log("[v0] Bybit klines fetch failed:", (err as Error).message);
    return NextResponse.json(
      { error: "Failed to fetch crypto data. Please try again." },
      { status: 502 }
    );
  }
}
