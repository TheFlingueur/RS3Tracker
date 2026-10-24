const express = require("express");
const cheerio = require("cheerio");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));
const PORT = process.env.PORT || 3000;
const PLAYER = process.env.RS3_PLAYER || "The_Deedz";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "tracker.sqlite"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS progress (
    item_type TEXT NOT NULL CHECK(item_type IN ('quest','area')),
    item_key TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(item_type, item_key)
  );
`);

const getProgress = db.prepare("SELECT item_type, item_key, completed, updated_at FROM progress ORDER BY item_type, item_key");
const setProgress = db.prepare(`
  INSERT INTO progress (item_type, item_key, completed, updated_at)
  VALUES (@type, @key, @completed, CURRENT_TIMESTAMP)
  ON CONFLICT(item_type, item_key) DO UPDATE SET
    completed=excluded.completed, updated_at=CURRENT_TIMESTAMP
`);
const deleteProgress = db.prepare("DELETE FROM progress WHERE item_type=? AND item_key=?");

async function fetchPage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "TheDeedzRS3ProgressTracker/1.1 (personal dashboard)",
      "Accept": "text/html,application/xhtml+xml"
    },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  return await response.text();
}
function clean(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

app.get("/api/health", (_req, res) => res.json({ ok: true, player: PLAYER }));
app.get("/api/config", (_req, res) => res.json({ player: PLAYER }));
app.get("/api/progress", (_req, res) => res.json({ items: getProgress.all() }));

app.put("/api/progress", (req, res) => {
  const { type, key, completed } = req.body || {};
  if (!["quest", "area"].includes(type) || typeof key !== "string" ||
      !key.trim() || key.length > 300 || typeof completed !== "boolean") {
    return res.status(400).json({ error: "Expected type (quest/area), key (string), and completed (boolean)." });
  }
  setProgress.run({ type, key: key.trim(), completed: completed ? 1 : 0 });
  res.json({ ok: true, type, key: key.trim(), completed });
});

app.delete("/api/progress", (req, res) => {
  const { type, key } = req.body || {};
  if (!["quest", "area"].includes(type) || typeof key !== "string" || !key.trim()) {
    return res.status(400).json({ error: "Expected type (quest/area) and key (string)." });
  }
  deleteProgress.run(type, key.trim());
  res.json({ ok: true });
});

app.get("/api/profile", async (_req, res) => {
  const url = `https://secure.runescape.com/m=adventurers-log/profile?searchName=${encodeURIComponent(PLAYER)}`;
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const title = clean($("title").text());
    const pageText = clean($("body").text()).slice(0, 10000);
    const stats = [];
    $("table tr").each((_i, row) => {
      const cells = $(row).find("th,td").map((_j, el) => clean($(el).text())).get().filter(Boolean);
      if (cells.length >= 2) stats.push({ label: cells[0], value: cells.slice(1).join(" ") });
    });
    res.json({
      player: PLAYER, source: url, title, stats, pageText,
      note: stats.length
        ? "Official page retrieved; detected table data is shown below."
        : "The official page responded, but structured stats were not detected. Its layout or access rules may have changed."
    });
  } catch (error) {
    res.status(502).json({
      player: PLAYER, source: url, stats: [], error: error.message,
      note: "Could not retrieve the official Adventurer's Log from this deployment. You can still use the trackers and open the official source."
    });
  }
});

app.get("/api/wiki/quests", async (_req, res) => {
  const url = "https://runescape.wiki/w/Quests/Progression_guide";
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const quests = [];
    const seen = new Set();
    $("li a[href^='/w/']").each((_i, a) => {
      const name = clean($(a).text());
      const href = $(a).attr("href");
      if (!name || !href || name.length > 100 || /^(edit|talk|read|view source)$/i.test(name)) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      quests.push({ name, url: new URL(href, "https://runescape.wiki").href });
    });
    res.json({ source: url, quests, note: "Quest links are extracted from the current progression guide. Check the original guide for ordering or formatting changes." });
  } catch (error) {
    res.status(502).json({ source: url, quests: [], error: error.message });
  }
});

app.get("/api/wiki/areas", async (_req, res) => {
  const url = "https://runescape.wiki/w/Area_Tasks_achievements";
  try {
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const areas = [];
    $("h2, h3, h4").each((_i, el) => {
      const name = clean($(el).text().replace(/\[edit\]/gi, ""));
      if (name && !/^(contents|references|see also|external links)$/i.test(name)) areas.push(name);
    });
    res.json({ source: url, areas: [...new Set(areas)], note: "Area headings are imported from the Wiki. Completion is tracked by this app, not synced from Jagex." });
  } catch (error) {
    res.status(502).json({ source: url, areas: [], error: error.message });
  }
});

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, "0.0.0.0", () => console.log(`Tracker listening on ${PORT}; player=${PLAYER}; data=${DATA_DIR}`));
