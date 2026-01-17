import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 3000;

// 1. Configuration: Map Endpoints to Specific SportyBet URLs
const URL_MAP = {
    basketball: "https://www.sportybet.com/ng/sport/basketball/sr:category:15_sr:category:top/sr:tournament:648_sr:tournament:138_sr:tournament:132_sr:tournament:264_sr:tournament:1562_sr:tournament:227_sr:tournament:262_sr:tournament:519_sr:tournament:1680_sr:tournament:1566/",
    tennis: "https://www.sportybet.com/ng/sport/tennis/sr:category:6/sr:tournament:2571",
    boxing: "https://www.sportybet.com/ng/sport/boxing/sr:category:27/sr:tournament:24327",
    mma: "https://www.sportybet.com/ng/sport/mma",
    darts: "https://www.sportybet.com/ng/sport/darts",
    badminton: "https://www.sportybet.com/ng/sport/badminton",
    baseball: "https://www.sportybet.com/ng/sport/baseball",
    // Default fallback if needed
    football: "https://www.sportybet.com/ng/sport/football"
};

// 2. The Scraping Logic (Reused and made generic)
async function scrapeSportyBet(url) {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new", // Use new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Block images and fonts to speed up loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'font', 'stylesheet'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set viewport and User Agent
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        console.log(`[Scraper] Navigating to: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Wait for the main match container
        try {
            await page.waitForSelector('.match-league', { timeout: 15000 });
        } catch (e) {
            console.log("[Scraper] Warning: .match-league not found (Page might be empty)");
            return []; // Return empty array if no matches found
        }

        // Extract Data in Browser Context
        const matches = await page.evaluate(() => {
            const extracted = [];
            const leagueContainers = document.querySelectorAll('.match-league');

            leagueContainers.forEach(leagueContainer => {
                const leagueNameEl = leagueContainer.querySelector('.league-title .text');
                const leagueName = leagueNameEl ? leagueNameEl.innerText.trim() : "Unknown League";

                const rows = leagueContainer.querySelectorAll('.match-table .m-table-row');
                let currentDate = "";

                rows.forEach(row => {
                    // Handle Date Rows
                    if (row.classList.contains('date-row')) {
                        const dateEl = row.querySelector('.date');
                        if (dateEl) currentDate = dateEl.innerText.trim();
                    }
                    // Handle Match Rows
                    else if (row.classList.contains('match-row')) {
                        try {
                            const timeEl = row.querySelector('.clock-time');
                            const idEl = row.querySelector('.game-id');
                            const homeTeamEl = row.querySelector('.home-team');
                            const awayTeamEl = row.querySelector('.away-team');

                            const time = timeEl ? timeEl.innerText.trim() : "";
                            const gameId = idEl ? idEl.innerText.replace('ID:', '').trim() : "";
                            const homeTeam = homeTeamEl ? homeTeamEl.innerText.trim() : "";
                            const awayTeam = awayTeamEl ? awayTeamEl.innerText.trim() : "";

                            // Dynamic Odds Extraction
                            // We don't assume specific market names (like Over/Under) because 
                            // Tennis/Boxing differs from Basketball. We grab column 1 and column 2.
                            const marketCells = row.querySelectorAll('.market-cell .m-market');
                            let oddsData = {};

                            // Market 1 (Usually Winner / 1x2 / Moneyline)
                            if (marketCells.length > 0) {
                                const outcomes = marketCells[0].querySelectorAll('.m-outcome .m-outcome-odds');
                                // Map based on index (0=Home, 1=Draw/Away depending on sport)
                                if (outcomes.length > 0) oddsData['outcome_1'] = outcomes[0].innerText.trim();
                                if (outcomes.length > 1) oddsData['outcome_2'] = outcomes[1].innerText.trim();
                                if (outcomes.length > 2) oddsData['outcome_x'] = outcomes[2].innerText.trim(); // For 3-way markets
                            }

                            // Market 2 (Usually Over/Under or Handicap)
                            if (marketCells.length > 1) {
                                const specifierEl = marketCells[1].querySelector('.af-select-title .af-select-input');
                                const secOutcomes = marketCells[1].querySelectorAll('.m-outcome .m-outcome-odds');

                                if (specifierEl) oddsData['specifier'] = specifierEl.innerText.trim();
                                if (secOutcomes.length > 0) oddsData['sec_outcome_1'] = secOutcomes[0].innerText.trim();
                                if (secOutcomes.length > 1) oddsData['sec_outcome_2'] = secOutcomes[1].innerText.trim();
                            }

                            extracted.push({
                                league: leagueName,
                                id: gameId,
                                date: currentDate,
                                time: time,
                                teams: { home: homeTeam, away: awayTeam },
                                odds: oddsData
                            });

                        } catch (err) {
                            // Skip bad rows
                        }
                    }
                });
            });
            return extracted;
        });

        return matches;

    } catch (error) {
        console.error("[Scraper] Error:", error.message);
        throw error;
    } finally {
        if (browser) await browser.close();
    }
}

// 3. API Routes

// Route: /:sport (e.g., /basketball, /tennis)
app.get('/:sport', async (req, res) => {
    const sportKey = req.params.sport.toLowerCase();
    const targetUrl = URL_MAP[sportKey];

    if (!targetUrl) {
        return res.status(404).json({
            error: "Sport not found",
            message: `Available endpoints: ${Object.keys(URL_MAP).map(k => '/' + k).join(', ')}`
        });
    }

    try {
        console.log(`[API] Received request for: ${sportKey}`);
        const data = await scrapeSportyBet(targetUrl);
        res.json({
            sport: sportKey,
            count: data.length,
            matches: data
        });
    } catch (error) {
        res.status(500).json({ error: "Scraping failed", details: error.message });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.json({
        message: "SportyBet Scraper API is running.",
        usage: "GET /:sport",
        examples: [
            "http://localhost:3000/basketball",
            "http://localhost:3000/tennis",
            "http://localhost:3000/boxing",
            "http://localhost:3000/mma"
        ]
    });
});

// 4. Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});