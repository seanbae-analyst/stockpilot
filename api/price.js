module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'Ticker is required' });

  const symbol = ticker.toUpperCase().trim();

  try {
    // Yahoo Finance v8 API
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Yahoo Finance error: ' + response.status);

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No data found for ' + symbol);

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || meta.previousClose;
    const changeAmt = price - prevClose;
    const changePct = (changeAmt / prevClose) * 100;

    return res.status(200).json({
      ticker: symbol,
      price: parseFloat(price.toFixed(2)),
      prevClose: parseFloat(prevClose.toFixed(2)),
      change: parseFloat(changeAmt.toFixed(2)),
      changePct: parseFloat(changePct.toFixed(2)),
      name: meta.longName || meta.shortName || symbol,
      exchange: meta.exchangeName || '',
      currency: meta.currency || 'USD',
      marketState: meta.marketState || 'CLOSED',
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh || null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow || null,
    });

  } catch(e) {
    // Fallback: try v7 API
    try {
      const url2 = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
      const response2 = await fetch(url2, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const data2 = await response2.json();
      const quote = data2?.quoteResponse?.result?.[0];
      if (quote) {
        return res.status(200).json({
          ticker: symbol,
          price: parseFloat(quote.regularMarketPrice.toFixed(2)),
          prevClose: parseFloat(quote.regularMarketPreviousClose.toFixed(2)),
          change: parseFloat(quote.regularMarketChange.toFixed(2)),
          changePct: parseFloat(quote.regularMarketChangePercent.toFixed(2)),
          name: quote.longName || quote.shortName || symbol,
          exchange: quote.fullExchangeName || '',
          currency: quote.currency || 'USD',
          marketState: quote.marketState || 'CLOSED',
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || null,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow || null,
        });
      }
    } catch(e2) {}

    return res.status(404).json({ error: `Could not find price for ${symbol}. Please check the ticker symbol.` });
  }
}
