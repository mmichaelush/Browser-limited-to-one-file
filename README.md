# Browser Limited to One File (Offline)

This project is an **offline single-file viewer** for Android.

Instead of browsing online domains, the app loads one local file packaged in the APK from `android_asset`.

## What it does
- Loads local content from `file:///android_asset/<path>`.
- Blocks external network navigation (`http/https/ws/wss/intent`) in WebView mode.
- Supports two display modes:
  - `HTML` mode via hardened `WebView`
  - `PDF` mode via `PdfRenderer` (native Android rendering with next/previous page controls)

## Configuration
Configuration is done via `app/build.gradle` + optional environment variables during build.

- `CONTENT_MODE` (`HTML` or `PDF`, default: `HTML`)
- `LOCAL_CONTENT_PATH` (default: `content/index.html`)
- `VIEW_MODE` (`AUTO` / `PORTRAIT` / `LANDSCAPE`)
- `ENABLE_JAVASCRIPT` (`false` by default; applies to HTML mode)

## Local content location
Put your file under:

- `app/src/main/assets/content/index.html` (default HTML)
- `app/src/main/assets/content/document.pdf` (example PDF path)

Then set `LOCAL_CONTENT_PATH` accordingly.

## Notes
- In `PDF` mode, `LOCAL_CONTENT_PATH` must point to a valid PDF file in `assets`.
- In `HTML` mode, only local asset URLs are allowed for navigation.


## Build from GitHub UI (good for a static github.io frontend)
You can run APK builds directly from **GitHub Actions** using the workflow:

- `.github/workflows/build.yaml`

Open **Actions → 🤖 Build Offline APK → Run workflow** and fill:
- `request_id`
- `app_name`
- `application_id`
- `content_mode` (`HTML` / `PDF`)
- `local_content_path` (must exist under `app/src/main/assets/...`)
- `view_mode`
- `enable_javascript`

Optional:
- `icon_url` to generate launcher icons

### Required repository secrets
- `KEYSTORE` (base64 of your keystore file)
- `SIGNING_KEY_ALIAS`
- `SIGNING_KEY_PASSWORD`
- `SIGNING_STORE_PASSWORD`

After build, the workflow uploads the APK as artifact and also creates a prerelease with the APK attached.


## Static github.io frontend (optional)
You can publish a static UI from the `docs/` folder (GitHub Pages) and trigger the workflow remotely.

- UI files:
  - `docs/index.html`
  - `docs/main.js`
- Main action endpoint used by the UI:
  - `POST /repos/{owner}/{repo}/actions/workflows/build.yaml/dispatches`
- Extra convenience actions in UI:
  - Open latest release
  - Open latest workflow run
  - Open direct download of latest APK asset
- Client-side pre-validation before dispatch:
  - `application_id` format check
  - `content_mode` and file extension match (`.html`/`.pdf`)
  - path traversal guard for `local_content_path`
  - optional `icon_url` URL format check

### Publish on GitHub Pages
1. Repository Settings → Pages
2. Source: **Deploy from branch**
3. Branch: `main` and folder: `/docs`
4. Save

Then open your Pages URL and run builds via the form.

For production rollout checklist, see:
- `docs/DEPLOYMENT.md`


### API mode in static UI
The `docs/` frontend now supports two modes:
- **Direct GitHub API (PAT)**: sends requests directly to GitHub from the browser
- **Proxy Backend (recommended)**: sends requests to your backend endpoint (e.g. `https://your-proxy.example.com/dispatch`)

For a minimal backend starter, see:
- `docs/proxy-example-express.js`

Proxy example extras:
- Optional `X-Builder-Key` protection via `BUILDER_API_KEY`
- CORS allow-list via `ALLOW_ORIGIN`
- Basic rate limiting via `RATE_LIMIT_WINDOW_MS` + `RATE_LIMIT_MAX`
- Optional repository allow-list via `ALLOWED_REPOS`
- Health endpoint: `GET /health`

> Security note: by default token is **not persisted**.
> If you enable "remember token", it is saved to `localStorage` in that browser only.
> For production/public usage, place a backend proxy between UI and GitHub API.

## License
This application is distributed under GNU GPL-3.0. See [LICENSE](LICENSE).
