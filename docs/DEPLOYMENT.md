# Deployment Checklist (Offline APK Builder)

## 1) Repository prerequisites
- [ ] `main` branch contains latest offline changes.
- [ ] `app/src/main/assets/...` includes the files you plan to build (`.html` / `.pdf`).
- [ ] GitHub Actions is enabled for the repository.

## 2) Required GitHub secrets
Set these in **Settings → Secrets and variables → Actions**:
- [ ] `KEYSTORE` (base64 of keystore file)
- [ ] `SIGNING_KEY_ALIAS`
- [ ] `SIGNING_KEY_PASSWORD`
- [ ] `SIGNING_STORE_PASSWORD`

## 3) Dry run from Actions UI
Run workflow: **🤖 Build Offline APK**
- [ ] `request_id`
- [ ] `app_name`
- [ ] `application_id`
- [ ] `content_mode`
- [ ] `local_content_path`
- [ ] `view_mode`
- [ ] `enable_javascript`

Expected result:
- [ ] `assembleRelease` completes
- [ ] APK uploaded as artifact
- [ ] prerelease created with APK attached

## 4) GitHub Pages frontend (optional)
If using static UI:
- [ ] Settings → Pages → Deploy from branch
- [ ] Branch: `main`, folder: `/docs`
- [ ] Open Pages URL and verify form loads

## 5) Proxy mode (recommended for production)
If you do not want PAT in browser:
- [ ] Deploy proxy service from `docs/proxy-example-express.js`
- [ ] Set server env vars:
  - [ ] `GITHUB_TOKEN`
  - [ ] `BUILDER_API_KEY` (recommended)
  - [ ] `ALLOW_ORIGIN` (recommended)
  - [ ] `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` (recommended)
  - [ ] `ALLOWED_REPOS` (recommended allow-list)
- [ ] In UI choose **Proxy Backend** and set `Proxy Base URL`
- [ ] If required, set `Proxy API Key`

## 6) Production readiness checks
- [ ] Proxy `/health` endpoint returns `{ ok: true }`
- [ ] CORS restricted to your Pages origin
- [ ] Rate limiting active
- [ ] Repo allow-list active
- [ ] Successful build for HTML mode
- [ ] Successful build for PDF mode
- [ ] Failed invalid payload blocked before dispatch
