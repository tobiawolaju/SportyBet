import puppeteer from "puppeteer";
import fs from "fs";
import express from "express";

const app = express();
const PORT = 3000;

async function scrapeAndExtract() {
    const browser = await puppeteer.launch({
        headless: true, // Set to false if you want to see the browser working
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Set viewport to ensure desktop view is loaded
    await page.setViewport({ width: 1366, height: 768 });

    // Set a realistic User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log("Navigating to SportyBet...");
        // Increase timeout to 60 seconds as betting sites can be heavy
        await page.goto(
            "https://www.sportybet.com/ng/sport/basketball/sr:category:15_sr:category:top/sr:tournament:648_sr:tournament:138_sr:tournament:132_sr:tournament:264_sr:tournament:1562_sr:tournament:227_sr:tournament:262_sr:tournament:519_sr:tournament:1680_sr:tournament:1566/",
            {
                waitUntil: "networkidle2",
                timeout: 60000
            }
        );

        console.log("Waiting for match data to render...");
        // Critical: Wait for the specific class that holds the match data
        try {
            await page.waitForSelector('.match-league', { timeout: 30000 });
        } catch (e) {
            console.log("Warning: Selector .match-league not found within timeout. Page might be empty or loading slowly.");
        }

        console.log("Extracting data...");

        // page.evaluate runs the code INSIDE the browser, where 'document' exists
        const extractedData = await page.evaluate(() => {
            const matches = [];

            // 1. Select all League containers
            const leagueContainers = document.querySelectorAll('.match-league');

            leagueContainers.forEach(leagueContainer => {
                // Extract League Name
                const leagueNameEl = leagueContainer.querySelector('.league-title .text');
                const leagueName = leagueNameEl ? leagueNameEl.innerText.trim() : "Unknown League";

                // Get all rows (both date rows and match rows) within this league
                const rows = leagueContainer.querySelectorAll('.match-table .m-table-row');

                let currentDate = "";

                rows.forEach(row => {
                    // 2. Check if this is a Date Row (e.g., "17/01 Saturday")
                    if (row.classList.contains('date-row')) {
                        const dateEl = row.querySelector('.date');
                        if (dateEl) {
                            currentDate = dateEl.innerText.trim();
                        }
                    }
                    // 3. Check if this is a Match Row
                    else if (row.classList.contains('match-row')) {
                        try {
                            // Extract Time
                            const timeEl = row.querySelector('.clock-time');
                            const time = timeEl ? timeEl.innerText.trim() : "";

                            // Extract Game ID
                            const idEl = row.querySelector('.game-id');
                            // Remove "ID: " prefix if present
                            const gameId = idEl ? idEl.innerText.replace('ID:', '').trim() : "";

                            // Extract Teams
                            const homeTeamEl = row.querySelector('.home-team');
                            const awayTeamEl = row.querySelector('.away-team');
                            const homeTeam = homeTeamEl ? homeTeamEl.innerText.trim() : "";
                            const awayTeam = awayTeamEl ? awayTeamEl.innerText.trim() : "";

                            // Extract Odds
                            const marketCells = row.querySelectorAll('.market-cell .m-market');
                            let oddsData = {};

                            if (marketCells.length > 0) {
                                // Winner Market
                                const winnerOutcomes = marketCells[0].querySelectorAll('.m-outcome .m-outcome-odds');
                                if (winnerOutcomes.length >= 2) {
                                    oddsData['1'] = winnerOutcomes[0].innerText.trim();
                                    oddsData['2'] = winnerOutcomes[1].innerText.trim();
                                }
                            }

                            // Optional: Extract Handicap/Over/Under if present
                            if (marketCells.length > 1) {
                                const specifierEl = marketCells[1].querySelector('.af-select-title .af-select-input');
                                const secondaryOutcomes = marketCells[1].querySelectorAll('.m-outcome .m-outcome-odds');

                                if (specifierEl && secondaryOutcomes.length >= 2) {
                                    oddsData['specifier'] = specifierEl.innerText.trim();
                                    oddsData['over'] = secondaryOutcomes[0].innerText.trim();
                                    oddsData['under'] = secondaryOutcomes[1].innerText.trim();
                                }
                            }

                            // 4. Construct the JSON object
                            matches.push({
                                league: leagueName,
                                id: gameId,
                                date: currentDate,
                                time: time,
                                teams: {
                                    home: homeTeam,
                                    away: awayTeam
                                },
                                odds: oddsData
                            });

                        } catch (err) {
                            // We can't console.error inside browser context easily to node terminal, 
                            // but this prevents crash
                        }
                    }
                });
            });

            return matches;
        });

        console.log(`Successfully scraped ${extractedData.length} matches.`);
        return extractedData;

    } catch (error) {
        console.error("Scraping failed:", error.message);
        throw error;
    } finally {
        await browser.close();
    }
}

// scrapeAndExtract();

app.get("/api/matches", async (req, res) => {
    try {
        console.log("Fetching matches directly from SportyBet...");
        const matches = await scrapeAndExtract();
        res.json(matches);
    } catch (error) {
        res.status(500).json({ error: "Scraping failed: " + error.message });
    }
});

// Endpoint to trigger scrape manually (supports GET and POST)
app.get("/api/scrape", async (req, res) => {
    try {
        const matches = await scrapeAndExtract();
        res.json({ message: "Scraping completed successfully", count: matches.length, data: matches });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post("/api/scrape", async (req, res) => {
    try {
        const matches = await scrapeAndExtract();
        res.json({ message: "Scraping completed successfully", count: matches.length, data: matches });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

console.log("Starting Express server...");
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API matches endpoint: http://localhost:${PORT}/api/matches`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Error: Port ${PORT} is already in use. Please stop any other processes using this port.`);
    } else {
        console.error('Server error:', err);
    }
});
