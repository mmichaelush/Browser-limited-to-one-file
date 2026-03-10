# תכנית משימות: מעבר מדפדפן מוגבל-דומיינים לאפליקציית Offline לקובץ יחיד

## מטרה
להסב את האפליקציה ממודל של `WebView` שמטעין אתרים מהרשת (עם whitelist לדומיינים),
למודל סגור לחלוטין ללא גישה לרשת, שמציג **קובץ מקומי יחיד** (HTML או PDF) שמוטמע בתוך האפליקציה.

---

## 1) מה צריך להוסיף בפרויקט

### 1.1 תוכן מקומי בתוך האפליקציה
- ליצור תיקיית נכסים ייעודית לתוכן, למשל:
  - `app/src/main/assets/content/index.html`
  - או `app/src/main/assets/content/document.pdf`
- להחליט פורמט עבודה עיקרי:
  - **אפשרות A (מומלץ לפשטות):** HTML יחיד ב־assets, נטען ב־`file:///android_asset/...`
  - **אפשרות B (ל־PDF אמיתי):** שימוש ב־`PdfRenderer`/ספריית תצוגת PDF (ולא relying על WebView שיכול להיות לא עקבי בין מכשירים).

### 1.2 שכבת קונפיגורציה Offline
- להוסיף שדות `buildConfigField` חדשים ב־`app/build.gradle`:
  - `CONTENT_MODE` (`HTML`/`PDF`)
  - `LOCAL_CONTENT_PATH` (למשל `content/index.html`)
- כך אפשר לשנות תוכן בלי לגעת בלוגיקה.

### 1.3 UX לשגיאת טעינת קובץ מקומי
- להוסיף מסך/תצוגת fallback אם הקובץ חסר/לא נטען:
  - הודעה בעברית למשתמש
  - כפתור רענון
  - אפשרות לוג בסיסית ל־Logcat לצורך דיבוג.

---

## 2) מה צריך לשנות

### 2.1 לוגיקת טעינה ראשונית (`MainActivity`)
- להחליף את `mWebView.loadUrl(STARTUP_URL ... )` בטעינה של URI מקומי מתוך assets.
- לנטרל ניווט חיצוני כך שכל ניסיון לפתוח `http/https` ייחסם מיידית.
- אם נשארים עם WebView:
  - `setAllowFileAccess(true)` עבור assets מקומיים (בזהירות)
  - `setAllowContentAccess(false)` אם אין צורך
  - `setAllowFileAccessFromFileURLs(false)` כברירת מחדל
  - `setAllowUniversalAccessFromFileURLs(false)` כדי למנוע יציאה לרשת דרך JS.

### 2.2 מדיניות רשת ב־`WebViewClient`
- להסיר/להחליף את בדיקת whitelist (`ALLOWED_DOMAINS`, `STARTUP_URL`) במדיניות Offline קשיחה:
  - לאפשר רק סכמות `file:///android_asset/` (או `content://` פנימי בלבד)
  - לחסום כל `http:`, `https:`, `ws:`, `wss:`, `intent:`.
- לעדכן את הודעת החסימה לטקסט ייעודי כמו: “האפליקציה פועלת במצב ללא אינטרנט”.

### 2.3 התאמת הגדרות Build
- ב־`app/build.gradle` להסיר תלות במשתני סביבה של דומיינים/URL (`ALLOWED_DOMAINS`, `STARTUP_URL`, `ALLOW_GOOGLE_LOGIN`, `NO_SSL`).
- להחליף למשתני תוכן מקומי כפי שמתואר בסעיף 1.2.

### 2.4 מנגנון PDF (אם PDF הוא תרחיש מרכזי)
- אם נדרש PDF יציב בכלל המכשירים, להעביר תצוגה מ־WebView לרכיב ייעודי (למשל `PdfRenderer`) ולשקול מסך נפרד לתצוגת PDF.

---

## 3) מה צריך לערוך

### 3.1 AndroidManifest
- להסיר הרשאות רשת שאינן נדרשות:
  - `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`.
- להסיר הרשאות הורדה/אחסון אם לא יהיה צורך בהורדות/בחירת קובץ:
  - `ACCESS_DOWNLOAD_MANAGER`, `DOWNLOAD_WITHOUT_NOTIFICATION`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`.
- להסיר `android:usesCleartextTraffic` ו־`android:networkSecurityConfig` אם לא משתמשים ברשת.

### 3.2 משאבי רשת
- למחוק את `app/src/main/res/xml/network_security_config.xml` אם אין עוד שימוש.

### 3.3 README
- לעדכן תיעוד:
  - שם הפרויקט והייעוד החדש (Offline local viewer)
  - איך מחליפים קובץ HTML/PDF
  - אילו יכולות בוטלו (גלישה, הורדות, התחברות גוגל, whitelist).

---

## 4) מה צריך להתאים

### 4.1 אבטחה והקשחת WebView
- לשקול `setJavaScriptEnabled(false)` כברירת מחדל, ולהדליק רק אם התוכן המקומי חייב JS.
- לנטרל features לא נחוצים (file chooser, downloads, tel/mailto handling), כדי לצמצם משטח תקיפה.
- להגדיר מדיניות ברורה ללחיצה על קישורים מתוך ה־HTML המקומי:
  - או חסימה מוחלטת
  - או פתיחה חיצונית מפוקחת (אם תרצו בעתיד).

### 4.2 תאימות UX
- להתאים `VIEW_MODE`/אוריינטציה לצפייה נוחה בקובץ בודד (למשל PDF לרוחב).
- לבחון zoom ו־scroll לפי סוג התוכן.

### 4.3 בדיקות
- לבדוק על מכשיר/אמולטור ללא רשת:
  - טעינת הקובץ המקומי תמיד מצליחה
  - לחיצה על קישורי רשת נחסמת
  - אין קריסות כאשר קובץ חסר/שגוי
  - Back button לא מנסה לנווט להיסטוריית אתרים חיצוניים.

---

## 5) מה כבר אפשר למחוק

### 5.1 קוד שלא רלוונטי למצב Offline
- מנגנון whitelist לדומיינים: `ALLOWED_DOMAINS`, `STARTUP_URL` ולוגיקת host filtering.
- Google login workaround (כולל user-agent מיוחד והדיאלוג).
- טיפול בשגיאות SSL והדגל `NO_SSL`.
- `DownloadListener` והרשאות הורדה/אחסון (אם אין הורדות).
- `adblock` (כולל `AdBlockerUtil`) אם אין תעבורת רשת בכלל.
- file chooser אם אין צורך בהעלאת קבצים מהמשתמש.

### 5.2 קונפיגורציות Build מיושנות
- משתני סביבה שהיו מכוונים לאתרים מרוחקים.

---

## 6) סדר ביצוע מומלץ (Roadmap קצר)
1. שלב 1: מעבר לטעינת קובץ מקומי יחיד + חסימת כל URL חיצוני.
2. שלב 2: ניקוי Manifest והרשאות רשת/הורדה.
3. שלב 3: מחיקת קוד legacy (whitelist, SSL, Google login, adblock).
4. שלב 4: עדכון README והקשחת WebView.
5. שלב 5: בדיקות ידניות על מכשיר ללא אינטרנט.

---

## 7) החלטות מוצר שכדאי לסגור לפני מימוש
- האם הפורמט הראשי הוא HTML או PDF?
- האם רוצים לאפשר קישורים חיצוניים בעתיד?
- האם התוכן יתעדכן רק בבניית APK חדשה או דרך מנגנון עדכון פנימי?
- האם צריך לבחור קובץ מקומי מהמשתמש, או רק קובץ קשיח שמוטמע באפליקציה?
