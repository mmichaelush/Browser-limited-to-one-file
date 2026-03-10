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

## License
This application is distributed under GNU GPL-3.0. See [LICENSE](LICENSE).
