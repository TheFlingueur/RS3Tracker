# The_Deedz RS3 Tracker — Railway-ready

## Deploy on Railway

1. Extract this ZIP.
2. Create a GitHub repository and upload the **contents** of this folder.
3. In Railway, choose **New Project → Deploy from GitHub Repo** and select the repository.
4. In the service's **Settings → Networking**, choose **Generate Domain**.
5. Add a Railway **Volume** mounted at `/data` (recommended for persistent JSON file storage data).
6. In **Variables**, set `DATA_DIR=/data`. Optional: set `RS3_PLAYER=The_Deedz`.
7. Redeploy if Railway does not automatically redeploy after adding the variable/volume.

Railway should detect Node.js and run `npm start`. `railway.json` includes a health check at `/api/health`.

## Included
- Express web server and API
- JSON file storage-backed shared progress so checkmarks persist across browser/device sessions
- Profile fetch attempt for the official Adventurer's Log
- Best-effort quest and area-heading extraction from the RuneScape Wiki
- Mobile-friendly dark fantasy UI

## Notes and limitations
- Add a Railway Volume mounted at `/data` and set `DATA_DIR=/data` if you want JSON file storage data to survive redeploys/restarts. Without a persistent volume, local JSON file storage data may be lost.
- This tracker has no login. Anyone with the public URL can view and change shared checklist progress. Do not use it for private data. If you want personal-only access, add authentication before sharing.
- The official Adventurer's Log may block server requests or change markup; the app shows an error instead of inventing stats.
- Wiki scraping is best-effort and can change when the Wiki changes its HTML. The imported quest links/headings should be reviewed against the original guides.
- Area completion is manual; the app does not have access to Jagex's private account completion state.
- Unofficial fan project; not affiliated with Jagex.

## Local run
Requires Node.js 20+:
```bash
npm install
npm start
```
Open http://localhost:3000.


### Storage note
This version uses a JSON file in `DATA_DIR` instead of a native SQLite module, so Railway does not need to compile `better-sqlite3` or install Python for that dependency. Attach a Railway Volume mounted at `/data` and set `DATA_DIR=/data` to preserve progress across deployments.
