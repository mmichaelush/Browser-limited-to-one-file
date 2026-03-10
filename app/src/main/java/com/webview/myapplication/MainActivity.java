package com.webview.myapplication;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String VIEW_MODE = BuildConfig.VIEW_MODE;
    private static final String CONTENT_MODE = BuildConfig.CONTENT_MODE;
    private static final String LOCAL_CONTENT_PATH = BuildConfig.LOCAL_CONTENT_PATH;
    private static final boolean ENABLE_JAVASCRIPT = BuildConfig.ENABLE_JAVASCRIPT;

    private WebView webView;
    private LinearLayout pdfContainer;
    private ImageView pdfImage;
    private TextView pdfPageIndicator;
    private Button pdfPrevButton;
    private Button pdfNextButton;
    private ProgressBar progressBar;

    private ParcelFileDescriptor pdfFileDescriptor;
    private PdfRenderer pdfRenderer;
    private PdfRenderer.Page currentPdfPage;
    private int currentPageIndex = 0;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if ("PORTRAIT".equals(VIEW_MODE)) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        } else if ("LANDSCAPE".equals(VIEW_MODE)) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }

        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.activity_main_webview);
        pdfContainer = findViewById(R.id.pdf_container);
        pdfImage = findViewById(R.id.pdf_image);
        pdfPageIndicator = findViewById(R.id.pdf_page_indicator);
        pdfPrevButton = findViewById(R.id.pdf_prev_button);
        pdfNextButton = findViewById(R.id.pdf_next_button);
        progressBar = findViewById(R.id.progressBar);

        if ("PDF".equalsIgnoreCase(CONTENT_MODE)) {
            setupPdfMode();
        } else {
            setupWebViewMode();
        }
    }

    private void setupPdfMode() {
        webView.setVisibility(View.GONE);
        pdfContainer.setVisibility(View.VISIBLE);
        progressBar.setVisibility(View.VISIBLE);

        try {
            File localPdfFile = copyAssetToCache(LOCAL_CONTENT_PATH);
            pdfFileDescriptor = ParcelFileDescriptor.open(localPdfFile, ParcelFileDescriptor.MODE_READ_ONLY);
            pdfRenderer = new PdfRenderer(pdfFileDescriptor);

            pdfPrevButton.setOnClickListener(v -> showPdfPage(currentPageIndex - 1));
            pdfNextButton.setOnClickListener(v -> showPdfPage(currentPageIndex + 1));

            showPdfPage(0);
        } catch (Exception e) {
            progressBar.setVisibility(View.GONE);
            Toast.makeText(this, "לא ניתן לטעון את קובץ ה-PDF המקומי", Toast.LENGTH_LONG).show();
        }
    }

    private void showPdfPage(int pageIndex) {
        if (pdfRenderer == null || pageIndex < 0 || pageIndex >= pdfRenderer.getPageCount()) {
            return;
        }

        if (currentPdfPage != null) {
            currentPdfPage.close();
        }

        currentPdfPage = pdfRenderer.openPage(pageIndex);
        currentPageIndex = pageIndex;

        int pageWidth = currentPdfPage.getWidth() * 2;
        int pageHeight = currentPdfPage.getHeight() * 2;
        Bitmap bitmap = Bitmap.createBitmap(pageWidth, pageHeight, Bitmap.Config.ARGB_8888);
        bitmap.eraseColor(Color.WHITE);
        currentPdfPage.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
        pdfImage.setImageBitmap(bitmap);

        pdfPageIndicator.setText(String.format(Locale.US, "%d/%d", currentPageIndex + 1, pdfRenderer.getPageCount()));
        pdfPrevButton.setEnabled(currentPageIndex > 0);
        pdfNextButton.setEnabled(currentPageIndex < pdfRenderer.getPageCount() - 1);
        progressBar.setVisibility(View.GONE);
    }

    private File copyAssetToCache(String assetPath) throws IOException {
        File outFile = new File(getCacheDir(), "offline_content.pdf");
        try (InputStream input = getAssets().open(assetPath); FileOutputStream output = new FileOutputStream(outFile)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
            }
            output.flush();
        }
        return outFile;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebViewMode() {
        webView.setVisibility(View.VISIBLE);
        pdfContainer.setVisibility(View.GONE);

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(ENABLE_JAVASCRIPT);
        webSettings.setDomStorageEnabled(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setBuiltInZoomControls(true);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(true);
        webSettings.setDefaultTextEncodingName("utf-8");

        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(false);
        webSettings.setAllowFileAccessFromFileURLs(false);
        webSettings.setAllowUniversalAccessFromFileURLs(false);
        webSettings.setBlockNetworkLoads(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webSettings.setSafeBrowsingEnabled(false);
        }

        webView.setNetworkAvailable(false);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new OfflineWebViewClient());

        progressBar.setVisibility(View.VISIBLE);
        webView.loadUrl(buildLocalContentUrl());
    }

    private String buildLocalContentUrl() {
        return "file:///android_asset/" + LOCAL_CONTENT_PATH;
    }

    private boolean isAllowedOfflineUri(Uri uri) {
        if (uri == null || uri.getScheme() == null) {
            return false;
        }

        String scheme = uri.getScheme().toLowerCase(Locale.US);
        String raw = uri.toString();

        if ("file".equals(scheme)) {
            return raw.startsWith("file:///android_asset/");
        }

        if ("about".equals(scheme)) {
            return "about:blank".equals(raw);
        }

        return "data".equals(scheme);
    }

    private WebResourceResponse blockedResponse() {
        return new WebResourceResponse(
            "text/plain",
            "utf-8",
            new ByteArrayInputStream("Blocked: app is in offline mode".getBytes(StandardCharsets.UTF_8))
        );
    }

    private void showOfflineToast() {
        Toast.makeText(this, "האפליקציה פועלת במצב ללא אינטרנט", Toast.LENGTH_SHORT).show();
    }

    private class OfflineWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            if (isAllowedOfflineUri(request.getUrl())) {
                progressBar.setVisibility(View.VISIBLE);
                return false;
            }
            showOfflineToast();
            return true;
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, String url) {
            if (isAllowedOfflineUri(Uri.parse(url))) {
                progressBar.setVisibility(View.VISIBLE);
                return false;
            }
            showOfflineToast();
            return true;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            if (!isAllowedOfflineUri(request.getUrl())) {
                return blockedResponse();
            }
            return super.shouldInterceptRequest(view, request);
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            if (!isAllowedOfflineUri(Uri.parse(url))) {
                return blockedResponse();
            }
            return super.shouldInterceptRequest(view, url);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            progressBar.setVisibility(View.GONE);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            super.onReceivedError(view, request, error);
            if (request.isForMainFrame()) {
                showLocalFileError(view);
            }
        }

        @Override
        public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
            super.onReceivedError(view, errorCode, description, failingUrl);
            showLocalFileError(view);
        }

        private void showLocalFileError(WebView view) {
            progressBar.setVisibility(View.GONE);
            view.loadData(
                "<html><body><h2>לא ניתן לטעון את הקובץ המקומי.</h2><p>בדוק את LOCAL_CONTENT_PATH.</p></body></html>",
                "text/html; charset=utf-8",
                "UTF-8"
            );
        }
    }

    @Override
    protected void onDestroy() {
        if (currentPdfPage != null) {
            currentPdfPage.close();
        }
        if (pdfRenderer != null) {
            pdfRenderer.close();
        }
        if (pdfFileDescriptor != null) {
            try {
                pdfFileDescriptor.close();
            } catch (IOException ignored) {
            }
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView.getVisibility() == View.VISIBLE && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
