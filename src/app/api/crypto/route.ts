import { NextResponse } from "next/server";
import { fetchSpotTickers, type CryptoMarket } from "@/lib/bybit";

export const revalidate = 30;

// In-memory cache (per server instance) to limit upstream calls.
const CACHE_TTL = 30_000;
let cache: { ts: number; data: CryptoMarket[] } | null = null;

async function getMarkets(): Promise<CryptoMarket[]> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;
  const data = await fetchSpotTickers();
  cache = { ts: Date.now(), data };
  return data;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim().toLowerCase();

  try {
    const all = await getMarkets();
    // Sort by 24h turnover so the most liquid markets surface first.
    const sorted = [...all].sort((a, b) => b.volume - a.volume);

    let results: CryptoMarket[];
    if (query) {
      results = sorted
        .filter(
          (m) =>
            m.base.toLowerCase().includes(query) ||
            m.symbol.toLowerCase().includes(query) ||
            m.name.toLowerCase().includes(query)
        )
        .slice(0, 30);
    } else {
      results = sorted.slice(0, 50);
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.log("[v0] Bybit markets fetch failed:", (err as Error).message);
    if (cache) {
      return NextResponse.json({ results: cache.data, stale: true });
    }
    return NextResponse.json(
      { results: [], error: "upstream_unavailable" },
      { status: 503 }
    );
  }
}
