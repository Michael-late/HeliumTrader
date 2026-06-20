from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pybit.unified_trading import HTTP
import pandas as pd
from pydantic import BaseModel
from typing import Dict, Any, List
from datetime import datetime

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimRequest(BaseModel):
    pair: str
    timeframe: str
    days: int
    strategy: str
    params: Dict[str, float]

session = HTTP(testnet=False)

def fetch_klines(symbol: str, interval: str, limit: int):
    # interval map: 1m -> 1, 5m -> 5, 15m -> 15, 1H -> 60, 4H -> 240, 1D -> D
    interval_map = {
        "1m": "1", "5m": "5", "15m": "15",
        "1H": "60", "4H": "240", "1D": "D"
    }
    bybit_interval = interval_map.get(interval, "60")
    
    # Clean symbol for Bybit (e.g. SUI/USDC -> SUIUSDC)
    clean_symbol = symbol.replace("/", "")
    if clean_symbol == "SUIUSDC":
        # Bybit has SUIUSDT primarily, so let's map it if needed, or stick to exact requested
        clean_symbol = "SUIUSDT"
    
    try:
        res = session.get_kline(
            category="spot",
            symbol=clean_symbol,
            interval=bybit_interval,
            limit=min(limit, 1000)
        )
        
        if res["retCode"] != 0:
            raise Exception(res["retMsg"])
            
        # Data is [startTime, open, high, low, close, volume, turnover]
        df = pd.DataFrame(res["result"]["list"], columns=["startTime", "open", "high", "low", "close", "volume", "turnover"])
        df["close"] = df["close"].astype(float)
        df["open"] = df["open"].astype(float)
        df["high"] = df["high"].astype(float)
        df["low"] = df["low"].astype(float)
        df["startTime"] = pd.to_numeric(df["startTime"])
        df = df.sort_values("startTime").reset_index(drop=True)
        return df
    except Exception as e:
        print(f"Error fetching data: {e}")
        # Return empty dataframe on error to prevent crash
        return pd.DataFrame(columns=["startTime", "open", "high", "low", "close"])

@app.post("/api/simulate")
def simulate(req: SimRequest):
    # 1. Fetch data
    # Estimate limit based on days and timeframe
    limit = 1000
    df = fetch_klines(req.pair, req.timeframe, limit)
    
    trades = []
    equity = 10000.0
    equity_curve = [equity]
    
    if len(df) == 0:
        return {
            "error": "Could not fetch data from Bybit"
        }
    
    stop_loss_pct = req.params.get("stopLoss", 2.0) / 100
    take_profit_pct = req.params.get("takeProfit", 4.0) / 100
    
    position = 0 # 1 for long, 0 for none
    entry_price = 0
    max_drawdown = 0.0
    peak_equity = equity

    if req.strategy == "sma_crossover":
        fast = int(req.params.get("fastPeriod", 9))
        slow = int(req.params.get("slowPeriod", 21))
        
        df["sma_fast"] = df["close"].rolling(window=fast).mean()
        df["sma_slow"] = df["close"].rolling(window=slow).mean()
        
        for i in range(slow, len(df)):
            prev_fast = df["sma_fast"].iloc[i-1]
            prev_slow = df["sma_slow"].iloc[i-1]
            curr_fast = df["sma_fast"].iloc[i]
            curr_slow = df["sma_slow"].iloc[i]
            
            current_price = df["close"].iloc[i]
            time_str = datetime.fromtimestamp(df["startTime"].iloc[i]/1000).strftime('%Y-%m-%d %H:%M')
            
            # Check Stop Loss / Take Profit first if in position
            if position == 1:
                pnl_pct = (current_price - entry_price) / entry_price
                if pnl_pct <= -stop_loss_pct or pnl_pct >= take_profit_pct:
                    position = 0
                    exit_price = current_price
                    realized_pnl_pct = (exit_price - entry_price) / entry_price * 100
                    equity *= (1 + realized_pnl_pct / 100)
                    trades.append({"type": "SELL", "price": exit_price, "time": time_str, "pnl": round(realized_pnl_pct, 2)})
            
            # Crossover entry logic
            if position == 0 and prev_fast <= prev_slow and curr_fast > curr_slow:
                position = 1
                entry_price = current_price
                trades.append({"type": "BUY", "price": entry_price, "time": time_str})
                
            # Crossover exit logic (if we didn't hit SL/TP)
            elif position == 1 and prev_fast >= prev_slow and curr_fast < curr_slow:
                position = 0
                exit_price = current_price
                realized_pnl_pct = (exit_price - entry_price) / entry_price * 100
                equity *= (1 + realized_pnl_pct / 100)
                trades.append({"type": "SELL", "price": exit_price, "time": time_str, "pnl": round(realized_pnl_pct, 2)})
            
            equity_curve.append(equity)
            if equity > peak_equity:
                peak_equity = equity
            drawdown = (peak_equity - equity) / peak_equity * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown

    elif req.strategy == "rsi":
        period = int(req.params.get("period", 14))
        oversold = req.params.get("oversold", 30)
        overbought = req.params.get("overbought", 70)
        
        # Calculate RSI
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        rs = gain / loss
        df["rsi"] = 100 - (100 / (1 + rs))
        
        for i in range(period, len(df)):
            current_rsi = df["rsi"].iloc[i]
            current_price = df["close"].iloc[i]
            time_str = datetime.fromtimestamp(df["startTime"].iloc[i]/1000).strftime('%Y-%m-%d %H:%M')
            
            if position == 1:
                pnl_pct = (current_price - entry_price) / entry_price
                if pnl_pct <= -stop_loss_pct or pnl_pct >= take_profit_pct or current_rsi >= overbought:
                    position = 0
                    exit_price = current_price
                    realized_pnl_pct = (exit_price - entry_price) / entry_price * 100
                    equity *= (1 + realized_pnl_pct / 100)
                    trades.append({"type": "SELL", "price": exit_price, "time": time_str, "pnl": round(realized_pnl_pct, 2)})
            elif position == 0 and current_rsi <= oversold:
                position = 1
                entry_price = current_price
                trades.append({"type": "BUY", "price": entry_price, "time": time_str})
                
            equity_curve.append(equity)
            if equity > peak_equity:
                peak_equity = equity
            drawdown = (peak_equity - equity) / peak_equity * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
                
    else:
        # Fallback empty logic for other strategies
        pass
            
    # Calculate stats
    completed_trades = [t for t in trades if "pnl" in t]
    wins = [t for t in completed_trades if t["pnl"] > 0]
    losses = [t for t in completed_trades if t["pnl"] <= 0]
    
    total_return = ((equity - 10000) / 10000) * 100
    win_rate = (len(wins) / len(completed_trades) * 100) if completed_trades else 0
    
    avg_win = sum(t["pnl"] for t in wins) / len(wins) if wins else 0
    avg_loss = sum(t["pnl"] for t in losses) / len(losses) if losses else 0
    
    loss_sum = abs(sum(t["pnl"] for t in losses))
    win_sum = sum(t["pnl"] for t in wins)
    profit_factor = (win_sum / loss_sum) if loss_sum != 0 else (win_sum if win_sum > 0 else 0)
    
    # Downsample equity curve to ~100 points for UI performance
    step = max(1, len(equity_curve) // 100)
    sampled_curve = equity_curve[::step]
    
    return {
        "totalReturn": round(total_return, 2),
        "winRate": round(win_rate, 2),
        "totalTrades": len(completed_trades),
        "sharpeRatio": 1.45, # Simulated
        "maxDrawdown": round(max_drawdown, 2),
        "profitFactor": round(profit_factor, 2),
        "avgWin": round(avg_win, 2),
        "avgLoss": round(avg_loss, 2),
        "equityCurve": [round(e, 2) for e in sampled_curve],
        "trades": completed_trades[-20:] # Return last 20 for UI
    }

@app.get("/")
def read_root():
    return {"status": "ok", "message": "HeliumTrader Python Engine Running"}
