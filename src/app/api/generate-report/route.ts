import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { stats, strategy } = await req.json();

    // Since we don't have an OpenAI key set up yet, we will simulate
    // a streaming AI response to demonstrate the Vercel AI streaming UI.
    const encoder = new TextEncoder();
    
    // Construct a context-aware report based on the real Bybit stats
    const isProfitable = stats.totalReturn > 0;
    
    const fullReport = `**AI Performance Analysis**

Based on the backtest using historical Bybit data, the ${strategy.toUpperCase()} strategy yielded a **${isProfitable ? 'positive' : 'negative'}** return of **${Math.abs(stats.totalReturn)}%**.

**Key Observations**:
• The Win Rate of ${stats.winRate}% over ${stats.totalTrades} total trades suggests ${stats.winRate > 50 ? 'a solid edge in signal generation' : 'a need for better entry filters'}.
• The Max Drawdown was ${stats.maxDrawdown}%, indicating ${stats.maxDrawdown < 10 ? 'excellent risk management' : 'potential exposure to high volatility'}.
• The Profit Factor of ${stats.profitFactor} shows that gross profits ${stats.profitFactor > 1 ? 'exceeded' : 'underperformed'} gross losses.

**Actionable Recommendations**:
• ${stats.maxDrawdown > 5 ? 'Tighten your Stop-Loss to prevent further deep drawdowns.' : 'Your Stop-Loss is well calibrated.'}
• ${stats.winRate < 50 ? 'Consider combining this strategy with a trend filter (like a 200 SMA) to improve the win rate.' : 'You have a good win rate, consider optimizing the Take-Profit to capture larger moves.'}
• Run this simulation across different timeframes (e.g. 4H or 1D) to check for robustness.`;

    const customStream = new ReadableStream({
      async start(controller) {
        const chunks = fullReport.split(' ');
        for (const chunk of chunks) {
          // Send word by word to simulate AI typing
          controller.enqueue(encoder.encode(chunk + ' '));
          // Wait 30ms between words
          await new Promise((r) => setTimeout(r, 30));
        }
        controller.close();
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('AI Report Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
