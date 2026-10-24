# The_Deedz — RS3 Progress Tracker

A local web app with:
- An attempted live read of the official Adventurer's Log for `The_Deedz`
- Quest-guide link extraction from the RuneScape Wiki progression guide
- Area/achievement heading extraction from the RuneScape Wiki
- Search, completion filters, and browser-local checklists

## Requirements
- Node.js 18 or newer (uses built-in `fetch`)

## Run
1. Extract the ZIP.
2. Open a terminal in this folder.
3. Run `npm install`
4. Run `npm start`
5. Open http://localhost:3000

## Important limitations
The official Adventurer's Log may change markup, block automated requests, or not expose structured stats. The app displays an explicit message if the data cannot be read; it does not fabricate stats. Wiki extraction is best-effort and should be reviewed against the linked pages. Area-task completion is a local manual checklist and is not linked to the player's account. Progress is stored in the current browser's localStorage, not on a server.

This is an unofficial personal tool and is not affiliated with Jagex.
