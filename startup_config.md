LitForage - Project Setup Instructions

This document contains the un-wrapped configuration files from the Python wrapper. Because this is a Vite + Capacitor application, you will build the Android .apk using standard Gradle compilation, not Expo Application Services (EAS).

Step 1: Initialize the Repository

Create a new directory locally or in Project IDX, and construct the following file tree. Copy the contents of the files below into their respective locations.

/
├── android/
│   └── app/src/main/
│       ├── AndroidManifest.xml
│       └── java/com/chaynewild/litforage/
│           ├── MainActivity.java
│           └── ScholarBrowserPlugin.java
├── src/
│   ├── App.jsx           (<- Extracted in the previous code block)
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── capacitor.config.json
└── index.html


Step 2: Configuration Files

package.json

{
  "name": "litforage",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@capacitor/share": "^5.0.0",
    "@capacitor/filesystem": "^5.0.0",
    "@capacitor/browser": "^5.0.0",
    "@capacitor/core": "^5.0.0",
    "html5-qrcode": "^2.3.8",
    "lucide-react": "^0.263.1",
    "qrcode": "^1.5.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@capacitor/android": "^5.0.0",
    "@capacitor/cli": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.27",
    "tailwindcss": "^3.3.3",
    "vite": "^4.4.5"
  }
}


capacitor.config.json

{
  "appId": "com.chaynewild.litforage",
  "appName": "LitForage",
  "webDir": "dist",
  "bundledWebRuntime": false
}


vite.config.js

import { defineConfig } from 'vite'; 
import react from '@vitejs/plugin-react'; 

export default defineConfig({ 
    plugins: [react()] 
});


tailwind.config.js

export default { 
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'], 
    theme: { extend: {} }, 
    plugins: [] 
}


postcss.config.js

export default { 
    plugins: { 
        tailwindcss: {}, 
        autoprefixer: {} 
    } 
}


index.html

<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LitForage</title>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>


src/main.jsx

import React from 'react'; 
import ReactDOM from 'react-dom/client'; 
import App from './App.jsx'; 
import './index.css'; 

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);


src/index.css

@tailwind base;
@tailwind components;
@tailwind utilities;


Step 3: Native Android Files

After running npm install and npm run build, you must add the native Android folder by running npx cap add android. Once the folder is generated, overwrite the specific files with your custom Java code.

android/app/src/main/java/com/chaynewild/litforage/MainActivity.java

package com.chaynewild.litforage;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ScholarBrowserPlugin.class);
        super.onCreate(savedInstanceState);
    }
}


android/app/src/main/java/com/chaynewild/litforage/ScholarBrowserPlugin.java

package com.chaynewild.litforage;

import android.app.Dialog;
import android.content.Context;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.RelativeLayout;
import android.widget.TextView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ScholarBrowser")
public class ScholarBrowserPlugin extends Plugin {
    private Dialog dialog;
    private WebView webView;
    private Button fabCapture;
    private android.animation.ObjectAnimator currentAnimator;
    private GradientDrawable defaultShape;
    private boolean isFabEnabled = true;

    @PluginMethod
    public void open(PluginCall call) {
        String q = call.getString("query", "");
        String targetUrl = (q != null && !q.isEmpty()) ? "[https://scholar.google.com/scholar?q=](https://scholar.google.com/scholar?q=)" + android.net.Uri.encode(q) : "[https://scholar.google.com/scholar?hl=en&as_sdt=0%2C13&q=forest+canopy](https://scholar.google.com/scholar?hl=en&as_sdt=0%2C13&q=forest+canopy)";

        getActivity().runOnUiThread(() -> {
            if (dialog != null && dialog.isShowing()) {
                call.resolve();
                return;
            }
            Context context = getContext();
            dialog = new Dialog(context, android.R.style.Theme_DeviceDefault_Light_NoActionBar);
            android.widget.LinearLayout layout = new android.widget.LinearLayout(context);
            layout.setOrientation(android.widget.LinearLayout.VERTICAL);
            layout.setLayoutParams(new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
            layout.setBackgroundColor(Color.WHITE);

            android.widget.LinearLayout headerContainer = new android.widget.LinearLayout(context);
            headerContainer.setOrientation(android.widget.LinearLayout.VERTICAL);
            headerContainer.setBackgroundColor(Color.parseColor("#2d5a27"));
            headerContainer.setPadding(10, 10, 10, 10);

            android.widget.LinearLayout topRow = new android.widget.LinearLayout(context);
            topRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            topRow.setGravity(android.view.Gravity.CENTER_VERTICAL);

            Button backBtn = new Button(context);
            backBtn.setText("◀"); backBtn.setTextColor(Color.WHITE); backBtn.setBackgroundColor(Color.TRANSPARENT);
            backBtn.setMinWidth(0); backBtn.setMinimumWidth(0); backBtn.setPadding(15, 10, 15, 10);

            Button fwdBtn = new Button(context);
            fwdBtn.setText("▶"); fwdBtn.setTextColor(Color.WHITE); fwdBtn.setBackgroundColor(Color.TRANSPARENT);
            fwdBtn.setMinWidth(0); fwdBtn.setMinimumWidth(0); fwdBtn.setPadding(15, 10, 15, 10);

            Button homeBtn = new Button(context);
            homeBtn.setText("🏠"); homeBtn.setTextColor(Color.WHITE); homeBtn.setBackgroundColor(Color.TRANSPARENT);
            homeBtn.setMinWidth(0); homeBtn.setMinimumWidth(0); homeBtn.setPadding(15, 10, 15, 10);

            View spacer = new View(context);
            android.widget.LinearLayout.LayoutParams spacerParams = new android.widget.LinearLayout.LayoutParams(0, 1, 1.0f);
            spacer.setLayoutParams(spacerParams);

            Button closeBtn = new Button(context);
            closeBtn.setText("✖"); closeBtn.setTextColor(Color.WHITE); closeBtn.setBackgroundColor(Color.TRANSPARENT);
            closeBtn.setMinWidth(0); closeBtn.setMinimumWidth(0); closeBtn.setPadding(15, 10, 15, 10);

            topRow.addView(backBtn); topRow.addView(fwdBtn); topRow.addView(homeBtn); topRow.addView(spacer); topRow.addView(closeBtn);

            android.widget.LinearLayout bottomRow = new android.widget.LinearLayout(context);
            bottomRow.setOrientation(android.widget.LinearLayout.HORIZONTAL);
            bottomRow.setGravity(android.view.Gravity.CENTER_VERTICAL);
            bottomRow.setPadding(0, 10, 0, 10);

            android.widget.EditText urlBar = new android.widget.EditText(context);
            urlBar.setSingleLine(true); urlBar.setBackgroundColor(Color.WHITE); urlBar.setTextColor(Color.BLACK);
            urlBar.setTextSize(14f); urlBar.setPadding(20, 15, 20, 15);
            urlBar.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_GO);
            android.widget.LinearLayout.LayoutParams urlParams = new android.widget.LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1.0f);
            urlParams.setMargins(10, 0, 10, 0); urlBar.setLayoutParams(urlParams);

            Button goBtn = new Button(context);
            goBtn.setText("GO"); goBtn.setTextColor(Color.WHITE); goBtn.setBackgroundColor(Color.TRANSPARENT);
            goBtn.setMinWidth(0); goBtn.setMinimumWidth(0); goBtn.setPadding(15, 10, 15, 10);

            Button toggleFabBtn = new Button(context);
            toggleFabBtn.setText("🐿️ ON"); toggleFabBtn.setTextColor(Color.WHITE); toggleFabBtn.setBackgroundColor(Color.TRANSPARENT);
            toggleFabBtn.setMinWidth(0); toggleFabBtn.setMinimumWidth(0); toggleFabBtn.setPadding(15, 10, 15, 10);

            bottomRow.addView(urlBar); bottomRow.addView(goBtn); bottomRow.addView(toggleFabBtn);

            headerContainer.addView(topRow);
            headerContainer.addView(bottomRow);

            RelativeLayout webContainer = new RelativeLayout(context);
            android.widget.LinearLayout.LayoutParams wcParams = new android.widget.LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1.0f);
            webContainer.setLayoutParams(wcParams);

            webView = new WebView(context);
            webView.getSettings().setJavaScriptEnabled(true);
            webView.getSettings().setDomStorageEnabled(true);
            webContainer.addView(webView, new RelativeLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

            fabCapture = new Button(context);
            fabCapture.setText("🐿️ Forage");
            fabCapture.setTextColor(Color.parseColor("#2d5a27"));
            fabCapture.setAllCaps(false);
            fabCapture.setTextSize(16);

            defaultShape = new GradientDrawable();
            defaultShape.setShape(GradientDrawable.RECTANGLE);
            defaultShape.setCornerRadii(new float[] { 50, 50, 50, 50, 50, 50, 50, 50 });
            defaultShape.setColor(Color.parseColor("#bbf7d0"));
            defaultShape.setStroke(4, Color.parseColor("#4ade80"));
            fabCapture.setBackground(defaultShape);
            fabCapture.setPadding(50, 30, 50, 30);
            fabCapture.setElevation(15f);

            RelativeLayout.LayoutParams fabParams = new RelativeLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            fabParams.addRule(RelativeLayout.ALIGN_PARENT_BOTTOM);
            fabParams.addRule(RelativeLayout.CENTER_HORIZONTAL);
            fabParams.setMargins(0, 0, 0, 80);
            fabCapture.setLayoutParams(fabParams);
            fabCapture.setVisibility(View.GONE);
            webContainer.addView(fabCapture);

            layout.addView(headerContainer);
            layout.addView(webContainer);

            backBtn.setOnClickListener(v -> { if(webView.canGoBack()) webView.goBack(); });
            fwdBtn.setOnClickListener(v -> { if(webView.canGoForward()) webView.goForward(); });
            homeBtn.setOnClickListener(v -> webView.loadUrl("[https://www.google.com](https://www.google.com)"));
            closeBtn.setOnClickListener(v -> dialog.dismiss());
            goBtn.setOnClickListener(v -> {
                String target = urlBar.getText().toString();
                if (!target.startsWith("http")) target = "https://" + target;
                webView.loadUrl(target);
            });
            urlBar.setOnEditorActionListener((v, actionId, event) -> {
                if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_GO) {
                    goBtn.performClick(); return true;
                } return false;
            });
            toggleFabBtn.setOnClickListener(v -> {
                isFabEnabled = !isFabEnabled;
                toggleFabBtn.setText(isFabEnabled ? "🐿️ ON" : "🐿️ OFF");
                if (!isFabEnabled) {
                    fabCapture.setVisibility(View.GONE);
                } else {
                    String currentUrl = webView.getUrl();
                    if (currentUrl == null || !currentUrl.contains("scholar.google")) fabCapture.setVisibility(View.VISIBLE);
                }
            });

            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void captureFromScholar(String title, String url, String authorsAndJournal) {
                    JSObject ret = new JSObject(); ret.put("title", title); ret.put("url", url); ret.put("authorsAndJournal", authorsAndJournal);
                    notifyListeners("onAcornCaptured", ret);
                }
                @JavascriptInterface
                public void captureUniversal(String title, String url, String doi) {
                    JSObject ret = new JSObject(); ret.put("title", title); ret.put("url", url); ret.put("doi", doi);
                    notifyListeners("onAcornCaptured", ret);
                }
                @JavascriptInterface
                public void captureRichJson(String jsonPayload) {
                    JSObject ret = new JSObject();
                    ret.put("isRichJson", true);
                    ret.put("payload", jsonPayload);
                    notifyListeners("onAcornCaptured", ret);

                    if(getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            if (currentAnimator != null) {
                                currentAnimator.cancel();
                                fabCapture.setRotation(0f);
                            }
                            fabCapture.setText("✓ Saved!");
                            fabCapture.setBackgroundColor(Color.parseColor("#f1f5f9"));
                            new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                                fabCapture.setText("🐿️ Forage");
                                fabCapture.setBackground(defaultShape);
                                fabCapture.setEnabled(true);
                            }, 2000);
                        });
                    }
                }
            }, "AndroidBridge");

            webView.setWebChromeClient(new WebChromeClient());
            webView.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    urlBar.setText(url);
                    if (url != null && url.contains("scholar.google")) {
                        fabCapture.setVisibility(View.GONE); injectLeftAlignedCritters(view);
                    } else if (isFabEnabled) {
                        fabCapture.setVisibility(View.VISIBLE);
                    } else {
                        fabCapture.setVisibility(View.GONE);
                    }
                }
            });

            fabCapture.setOnClickListener(v -> {
                fabCapture.setEnabled(false);
                fabCapture.setText("🐿️");
                currentAnimator = android.animation.ObjectAnimator.ofFloat(fabCapture, "rotation", 0f, 360f);
                currentAnimator.setDuration(800);
                currentAnimator.setRepeatCount(android.animation.ObjectAnimator.INFINITE);
                currentAnimator.setInterpolator(new android.view.animation.LinearInterpolator());
                currentAnimator.start();

                String scraper = "(function() {" +
                "  const formatAuthor = (authorStr) => {" +
                "      if (!authorStr || authorStr.toLowerCase().includes('unknown')) return 'Unknown Author';" +
                "      let authors = authorStr.split(/,| and |&|;/);" +
                "      for (let i = 0; i < authors.length; i++) {" +
                "          let current = authors[i].trim();" +
                "          if (!current.includes(',') && current.includes(' ')) {" +
                "              let parts = current.split(' ');" +
                "              if (parts.length > 1) { let last = parts.pop(); authors[i] = last + ', ' + parts.join(' '); }" +
                "          } else { authors[i] = current; }" +
                "      }" +
                "      return authors.filter(a => a).join('; ');" +
                "  };" +
                "  const cleanISBN = (isbnStr) => {" +
                "      if(!isbnStr) return null;" +
                "      const cleaned = isbnStr.replace(/[^0-9X]/gi, '');" +
                "      if (cleaned.length === 10 || cleaned.length === 13) return cleaned;" +
                "      return null;" +
                "  };" +
                "  let data = null;" +
                "  try {" +
                "      const scripts = document.querySelectorAll('script[type=\"application/ld+json\"]');" +
                "      for (let s of scripts) {" +
                "          const json = JSON.parse(s.textContent);" +
                "          const items = Array.isArray(json) ? json : [json];" +
                "          for (const item of items) {" +
                "              const type = item['@type'];" +
                "              if (type === 'Book' || type === 'Product' || type === 'ScholarlyArticle' || type === 'Article') {" +
                "                  let isbn = item.isbn || item.isbn13 || item.isbn10;" +
                "                  if (!isbn && item.productID && item.productID.toString().toLowerCase().includes('isbn')) {" +
                "                      isbn = item.productID.toString().replace(/[^0-9X]/gi, '');" +
                "                  }" +
                "                  const title = item.name || item.headline || document.title;" +
                "                  if ((isbn || type === 'Book' || type === 'ScholarlyArticle') && title) {" +
                "                      let rawAuthor = Array.isArray(item.author) ? item.author.map(a => a.name).join('; ') : (item.author ? (item.author.name || item.author) : 'Unknown Author');" +
                "                      data = {" +
                "                          title: title," +
                "                          author: formatAuthor(rawAuthor)," +
                "                          year: item.datePublished ? item.datePublished.substring(0, 4) : new Date().getFullYear().toString()," +
                "                          journal: item.publisher && item.publisher.name ? (typeof item.publisher.name === 'string' ? item.publisher.name : window.location.hostname) : window.location.hostname," +
                "                          doi: isbn ? `ISBN:${cleanISBN(isbn) || isbn}` : 'N/A'," +
                "                          type: (type === 'Book' || type === 'Product') ? 'book' : 'journal-article'," +
                "                          url: window.location.href" +
                "                      };" +
                "                      break;" +
                "                  }" +
                "              }" +
                "          }" +
                "          if (data) break;" +
                "      }" +
                "  } catch(e) {}" +
                "  if (!data && (document.contentType === 'application/pdf' || window.location.pathname.endsWith('.pdf') || window.location.href.includes('viewcontent.cgi'))) {" +
                "      let pdfTitle = document.title || 'Untitled PDF';" +
                "      let pdfAuthor = 'Unknown Author';" +
                "      if (pdfTitle.includes('/') || pdfTitle.includes('\\\\')) pdfTitle = pdfTitle.split(/[\\\\\\/]/).pop();" +
                "      pdfTitle = pdfTitle.replace(/\\.(pdf|cgi).*$/i, '').replace(/_/g, ' ').replace(/-/g, ' ');" +
                "      if (pdfTitle.includes(' by ')) {" +
                "          const parts = pdfTitle.split(/ by /i);" +
                "          pdfTitle = parts[0]; pdfAuthor = formatAuthor(parts[1]);" +
                "      }" +
                "      data = { title: pdfTitle.trim(), url: window.location.href, year: new Date().getFullYear().toString(), journal: window.location.hostname, type: 'report', doi: 'N/A', author: pdfAuthor.trim() };" +
                "  }" +
                "  if (!data) {" +
                "      const host = window.location.hostname;" +
                "      if (host.includes('amazon.')) {" +
                "          const t = document.getElementById('productTitle');" +
                "          if (t) {" +
                "              const a = document.querySelector('#bylineInfo .author a, .contributorNameID');" +
                "              let asinMatch = window.location.href.match(/\\/(?:dp|o|asin|product)\\/([a-zA-Z0-9]{10})/i);" +
                "              let doiStr = 'N/A';" +
                "              if (asinMatch && /^\\d{9}[\\dX]$/i.test(asinMatch[1])) doiStr = `ISBN:${asinMatch[1]}`;" +
                "              data = {" +
                "                  title: t.textContent.trim()," +
                "                  author: a ? formatAuthor(a.textContent.trim()) : 'Unknown Author'," +
                "                  year: new Date().getFullYear().toString()," +
                "                  journal: 'Amazon'," +
                "                  type: 'book'," +
                "                  doi: doiStr," +
                "                  url: window.location.href" +
                "              };" +
                "          }" +
                "      }" +
                "  }" +
                "  if (!data) {" +
                "      data = { title: document.title, url: window.location.href, year: new Date().getFullYear().toString(), journal: window.location.hostname, type: 'webpage', doi: 'N/A', author: 'Unknown Author' };" +
                "      const metaTags = document.getElementsByTagName('meta');" +
                "      for (let i = 0; i < metaTags.length; i++) {" +
                "          const name = (metaTags[i].name || '').toLowerCase();" +
                "          const prop = (metaTags[i].getAttribute('property') || '').toLowerCase();" +
                "          const content = metaTags[i].content;" +
                "          if (!content) continue;" +
                "          if (name === 'citation_title' || prop === 'og:title') data.title = content;" +
                "          if (name === 'citation_author') data.author = data.author === 'Unknown Author' ? formatAuthor(content) : data.author + '; ' + formatAuthor(content);" +
                "          if (name === 'citation_date' || name === 'citation_year') data.year = content.substring(0, 4);" +
                "          if (name === 'citation_journal_title' || prop === 'og:site_name') data.journal = content;" +
                "          if (name === 'citation_doi') data.doi = content;" +
                "          if (name === 'citation_pdf_url') data.url = content;" +
                "          if (name === 'citation_isbn' || prop.includes('isbn')) { data.doi = `ISBN:${cleanISBN(content) || content}`; data.type = 'book'; }" +
                "      }" +
                "  }" +
                "  if (data.doi === 'N/A' || data.author === 'Unknown Author') {" +
                "      const text = document.body.textContent.substring(0, 15000);" +
                "      if (data.doi === 'N/A') {" +
                "          if (data.type !== 'book') {" +
                "              const doiMatch = text.match(/\\b(10\\.\\d{4,9}\\/[-._;()/:a-zA-Z0-9]+)\\b/i);" +
                "              if (doiMatch) data.doi = doiMatch[1];" +
                "          }" +
                "          if (data.doi === 'N/A') {" +
                "              let isbnMatch = text.match(/(97[89][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9])/);" +
                "              if (!isbnMatch) isbnMatch = text.match(/\\b([01][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9][-\\s]?[0-9X])\\b/i);" +
                "              if (isbnMatch) {" +
                "                  const clean = cleanISBN(isbnMatch[0]);" +
                "                  if (clean) { data.doi = `ISBN:${clean}`; data.type = 'book'; }" +
                "              }" +
                "          }" +
                "      }" +
                "      if (data.author === 'Unknown Author') {" +
                "          const byMatch = text.match(/(?:^|\\n)\\s*(?:By|Author[:\\-])\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z\\.]+){1,3})/);" +
                "          if (byMatch) data.author = formatAuthor(byMatch[1].trim());" +
                "      }" +
                "      if (data.year === new Date().getFullYear().toString() || data.year === 'n.d.') {" +
                "          const dateMatches = text.match(/\\b(19|20)\\d{2}\\b/g);" +
                "          if (dateMatches) data.year = dateMatches[dateMatches.length - 1];" +
                "      }" +
                "  }" +
                "  window.AndroidBridge.captureRichJson(JSON.stringify(data));" +
                "})();";

                webView.evaluateJavascript(scraper, null);

                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                    if (currentAnimator != null && currentAnimator.isRunning()) {
                        currentAnimator.cancel();
                        fabCapture.setRotation(0f);
                        fabCapture.setText("🐿️ Forage");
                        fabCapture.setEnabled(true);
                    }
                }, 5000);
            });

            dialog.setContentView(layout);
            dialog.show();
            webView.loadUrl(targetUrl);
            call.resolve();
        });
    }

    private void injectLeftAlignedCritters(WebView view) {
        String js = "(function(){document.querySelectorAll('.gs_ri').forEach(function(r){if(!r.querySelector('.litforage-btn')){var c=r.querySelector('.gs_rt');if(c){c.style.display='flex';c.style.alignItems='flex-start';c.style.gap='10px';var b=document.createElement('button');b.innerHTML='🐿️';b.className='litforage-btn';b.style.cssText='background:#f0fdf4;color:#2d5a27;border:1px solid #bbf7d0;border-radius:8px;padding:4px 8px;font-size:18px;flex-shrink:0;margin-top:2px';b.onclick=function(e){e.preventDefault();e.stopPropagation();var a=c.querySelector('a'),m=r.querySelector('.gs_a');if(window.AndroidBridge)window.AndroidBridge.captureFromScholar(a?a.innerText:'Unknown Title',a?a.href:'',m?m.innerText:'');b.innerHTML='✓';b.style.cssText='background:#f1f5f9;border-color:#e2e8f0';b.disabled=!0};c.insertBefore(b,c.firstChild)}}})})();";
        view.evaluateJavascript(js, null);
    }
}


android/app/src/main/AndroidManifest.xml (Update Required)
Ensure your AndroidManifest contains these permissions inside the <manifest> tag, above the <application> tag:

<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />


Step 4: Build and Deployment Pipeline

To compile this project locally or in Project IDX, you execute standard Gradle commands rather than EAS commands:

npm install

npm run build

npx cap sync android

cd android

./gradlew assembleDebug (This outputs the APK to android/app/build/outputs/apk/debug/app-debug.apk).