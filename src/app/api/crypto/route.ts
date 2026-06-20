import { NextResponse } from "next/server";

export const revalidate = 60;

const CG = "https://api.coingecko.com/api/v3";

interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number | null;
}

interface CryptoResult {
  id: string;
  symbol: string;   // base asset, e.g. "BTC"
  name: string;     // e.g. "Bitcoin"
  image: string;
  tvSymbol: string; // TradingView symbol, e.g. "BINANCE:BTCUSDT"
  price: number;
  change: number;   // 24h percent change
}

function mapMarkets(list: CoinMarket[]): CryptoResult[] {
  return list
    .filter((c) => Number.isFinite(c.current_price))
    .map((c) => {
      const sym = c.symbol.toUpperCase();
      const change = c.price_change_percentage_24h ?? 0;
      return {
        id: c.id,
        symbol: sym,
        name: c.name,
        image: c.image,
        tvSymbol: `BINANCE:${sym}USDT`,
        price: c.current_price,
        change: parseFloat(change.toFixed(2)),
      };
    });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").trim();

  try {
    let ids: string | null = null;

    // When searching, resolve matching coin ids first.
    if (query) {
      const searchRes = await fetch(
        `${CG}/search?query=${encodeURIComponent(query)}`,
        { next: { revalidate: 60 } }
      );
      if (!searchRes.ok) throw new Error(`search ${searchRes.status}`);
      const searchJson = await searchRes.json();
      const coins: Array<{ id: string }> = searchJson?.coins ?? [];
      if (coins.length === 0) {
        return NextResponse.json({ results: [] });
      }
      ids = coins.slice(0, 30).map((c) => c.id).join(",");
    }

    const marketsUrl = ids
      ? `${CG}/coins/markets?vs_currency=usd&ids=${encodeURIComponent(ids)}&order=market_cap_desc&per_page=30&page=1`
      : `${CG}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1`;

    const res = await fetch(marketsUrl, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`markets ${res.status}`);

    const list: CoinMarket[] = await res.json();
    return NextResponse.json({ results: mapMarkets(list) });
  } catch (err) {
    console.log("[v0] CoinGecko crypto fetch failed:", (err as Error).message);
    return NextResponse.json(
      { results: [], error: "Failed to load market data" },
      { status: 502 }
    );
  }
}
