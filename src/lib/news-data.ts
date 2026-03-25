export interface NewsItem {
  id: string;
  time: string;
  headline: string;
  source: string;
  category: "GOVT" | "CORP" | "ECON" | "MKTG" | "CMDTY" | "FX" | "TECH";
  urgency: "FLASH" | "URGENT" | "NORMAL";
  body: string;
}

const SOURCES = ["RTRS", "BBG", "DJNS", "AP", "AFX", "NIKKEI", "FT", "WSJ"];
const CATEGORIES: NewsItem["category"][] = ["GOVT", "CORP", "ECON", "MKTG", "CMDTY", "FX", "TECH"];

const HEADLINES: { headline: string; category: NewsItem["category"]; body: string }[] = [
  { headline: "FED HOLDS RATES STEADY AT 5.25-5.50% RANGE AS EXPECTED", category: "GOVT", body: "The Federal Reserve held its benchmark interest rate unchanged, citing ongoing progress on inflation while noting the labor market remains strong. Chair Powell indicated the committee needs more confidence before cutting rates." },
  { headline: "APPLE REPORTS Q4 REVENUE $89.5B VS EST $89.3B", category: "CORP", body: "Apple Inc. reported fourth-quarter results that slightly beat analyst expectations, driven by strong iPhone sales in emerging markets and continued growth in the services segment." },
  { headline: "US NONFARM PAYROLLS +256K VS EST +160K; UNEMPLOYMENT 4.1%", category: "ECON", body: "The U.S. economy added 256,000 jobs in the latest month, far exceeding expectations. The unemployment rate ticked down to 4.1%, suggesting continued labor market resilience." },
  { headline: "CRUDE OIL SURGES 3.2% ON MIDDLE EAST SUPPLY CONCERNS", category: "CMDTY", body: "WTI crude oil futures jumped over 3% as escalating tensions in the Middle East raised concerns about potential supply disruptions from key producing regions." },
  { headline: "EUR/USD DROPS TO 1.0720 AFTER ECB SIGNALS RATE PAUSE", category: "FX", body: "The euro fell sharply against the dollar after ECB President signaled the central bank would hold rates at current levels for an extended period, diverging from market expectations of a near-term cut." },
  { headline: "NVIDIA MARKET CAP SURPASSES $2T ON AI CHIP DEMAND", category: "TECH", body: "Nvidia Corporation's market capitalization exceeded $2 trillion for the first time, fueled by surging demand for its AI accelerator chips from major cloud providers and enterprise customers." },
  { headline: "CHINA GDP GROWTH SLOWS TO 4.7% IN Q3 VS 5.3% PRIOR", category: "ECON", body: "China's economy grew at a slower pace in the third quarter, weighed down by a prolonged property sector downturn and weak consumer spending despite government stimulus measures." },
  { headline: "TREASURY 10Y YIELD RISES TO 4.65% HIGHEST SINCE NOV", category: "GOVT", body: "The benchmark 10-year Treasury yield climbed to its highest level since November as strong economic data pushed back expectations for Federal Reserve rate cuts." },
  { headline: "JPMORGAN BEATS Q1 ESTIMATES; RAISES FULL-YEAR GUIDANCE", category: "CORP", body: "JPMorgan Chase reported first-quarter earnings that exceeded analyst estimates, driven by strong trading revenue and net interest income. The bank raised its full-year NII guidance." },
  { headline: "GOLD HITS RECORD $2,450/OZ ON CENTRAL BANK BUYING", category: "CMDTY", body: "Gold prices surged to a new all-time high as central banks continued to accumulate reserves and geopolitical uncertainty drove safe-haven demand." },
  { headline: "S&P 500 CLOSES AT ALL-TIME HIGH ABOVE 5,500", category: "MKTG", body: "The S&P 500 index closed at a record high, driven by broad-based gains across technology and financial sectors. Market breadth improved significantly from recent sessions." },
  { headline: "BOJ RAISES RATES FOR FIRST TIME SINCE 2007; YEN SURGES", category: "FX", body: "The Bank of Japan ended its negative interest rate policy, raising the short-term rate target to 0-0.1%. The yen strengthened sharply on the historic policy shift." },
  { headline: "TESLA DELIVERIES MISS ESTIMATES; SHARES DROP 5% AFTER-HOURS", category: "CORP", body: "Tesla reported quarterly vehicle deliveries below analyst expectations, citing production challenges and softening demand in key markets including China and Europe." },
  { headline: "US CPI RISES 0.4% M/M VS EST 0.3%; CORE 3.8% Y/Y", category: "ECON", body: "Consumer prices rose more than expected, with the core measure remaining elevated. The data complicates the Federal Reserve's path to rate cuts and sent bond yields higher." },
  { headline: "OPEC+ EXTENDS PRODUCTION CUTS THROUGH Q2 2025", category: "CMDTY", body: "OPEC and its allies agreed to extend voluntary production cuts, aiming to support oil prices amid uncertain global demand outlook and rising non-OPEC supply." },
  { headline: "MICROSOFT AZURE REVENUE GROWS 29% Y/Y ON AI WORKLOADS", category: "TECH", body: "Microsoft reported strong cloud revenue growth driven by increasing adoption of AI services on its Azure platform. The company noted AI contributed 6 percentage points to Azure growth." },
  { headline: "UK INFLATION FALLS TO 2.3% BOOSTING RATE CUT HOPES", category: "ECON", body: "British consumer price inflation dropped more than expected, strengthening the case for the Bank of England to begin cutting interest rates at its next policy meeting." },
  { headline: "BITCOIN BREAKS $70,000 AHEAD OF HALVING EVENT", category: "TECH", body: "Bitcoin surged past $70,000 as anticipation builds ahead of the upcoming halving event, which will reduce the rate of new bitcoin creation by 50%." },
];

let counter = 0;

export function generateNewsItem(): NewsItem {
  const template = HEADLINES[Math.floor(Math.random() * HEADLINES.length)];
  const now = new Date();
  const id = `N${++counter}`;

  return {
    id,
    time: now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    headline: template.headline,
    source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
    category: template.category,
    urgency: Math.random() < 0.05 ? "FLASH" : Math.random() < 0.15 ? "URGENT" : "NORMAL",
    body: template.body,
  };
}

export function generateInitialNews(count: number): NewsItem[] {
  return Array.from({ length: count }, () => generateNewsItem());
}
