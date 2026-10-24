const express = require("express");
const cheerio = require("cheerio");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PLAYER = "The_Deedz";
app.use(express.static(path.join(__dirname, "public")));

async function getText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "TheDeedzProgressTracker/1.0 (personal RS3 tracker)" }
  });
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`);
  return await res.text();
}

app.get("/api/profile", async (_req, res) => {
  const url = `https://secure.runescape.com/m=adventurers-log/profile?searchName=${encodeURIComponent(PLAYER)}`;
  try {
    const html = await getText(url);
    const $ = cheerio.load(html);
    const pageText = $("body").text().replace(/\s+/g, " ").trim();
    const title = $("title").text().trim();
    // The Adventurer's Log markup can change or require browser/session access.
    // Return the source text for transparency rather than inventing stats.
    const statLines = [];
    $("table tr").each((_i, row) => {
      const cells = $(row).find("th,td").map((_j, el) => $(el).text().trim()).get().filter(Boolean);
      if (cells.length >= 2) statLines.push({ label: cells[0], value: cells.slice(1).join(" ") });
    });
    res.json({
      player: PLAYER, source: url, title,
      stats: statLines,
      pageText: pageText.slice(0, 9000),
      note: statLines.length ? "Profile content retrieved; values depend on the current official page markup." :
        "The official page loaded, but no structured stats were detected. The Adventurer's Log may have changed or may not expose profile data to automated requests."
    });
  } catch (e) {
    res.status(502).json({ player: PLAYER, source: url, error: e.message,
      note: "Could not retrieve the official Adventurer's Log from this server. Check the source link or try again later." });
  }
});

app.get("/api/wiki/quests", async (_req, res) => {
  const url = "https://runescape.wiki/w/Quests/Progression_guide";
  try {
    const html = await getText(url);
    const $ = cheerio.load(html);
    const quests = [];
    const seen = new Set();
    $("a[href^='/w/']").each((_i, a) => {
      const name = $(a).text().replace(/\s+/g, " ").trim();
      const href = $(a).attr("href");
      if (!name || !href || name.length > 90 || /^(edit|talk|read|view source)$/i.test(name)) return;
      const parent = $(a).closest("li");
      if (!parent.length) return;
      const key = `${name}|${href}`;
      if (seen.has(key)) return;
      seen.add(key);
      quests.push({ name, url: "https://runescape.wiki" + href });
    });
    res.json({ source: url, quests, note: "Extracted quest-like links from the current progression guide. Review the list against the guide because wiki markup can change." });
  } catch (e) {
    res.status(502).json({ source: url, error: e.message, quests: [] });
  }
});

app.get("/api/wiki/areas", async (_req, res) => {
  const url = "https://runescape.wiki/w/Area_Tasks_achievements";
  try {
    const html = await getText(url);
    const $ = cheerio.load(html);
    const areas = [];
    $("h2, h3").each((_i, el) => {
      const name = $(el).text().replace(/\[edit\]/gi, "").trim();
      if (name && !/^(Contents|References|See also|External links)$/i.test(name)) areas.push(name);
    });
    res.json({ source: url, areas: [...new Set(areas)], note: "Area headings extracted from the current wiki page; individual completion states are stored locally in your browser." });
  } catch (e) {
    res.status(502).json({ source: url, error: e.message, areas: [] });
  }
});

app.listen(PORT, () => console.log(`The_Deedz tracker running at http://localhost:${PORT}`));
