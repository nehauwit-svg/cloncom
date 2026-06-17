module.exports = async (req, res) => {
  const shopifyDomain = "frontendnode-production.up.railway.app";
  const proxyHost = req.headers.host;

  const targetURL = `https://${shopifyDomain}${req.url}`;

  try {
    let bodyBuffer = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      bodyBuffer = await new Promise((resolve, reject) => {
        const chunks = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
    }

    let fetchURL = targetURL;
    let response;
    let redirectCount = 0;

    while (redirectCount < 5) {
      response = await fetch(fetchURL, {
        method: req.method,
        headers: {
          ...req.headers,
          host: new URL(fetchURL).hostname,
          "X-Forwarded-Host": proxyHost,
          "X-Forwarded-Proto": "https",
        },
        body: bodyBuffer || null,
        redirect: "manual",
      });

      if (response.status >= 300 && response.status < 400) {
        let location = response.headers.get("location") || "";

        if (location.includes(shopifyDomain)) {
          location = location
            .replace(`https://${shopifyDomain}`, `https://${proxyHost}`)
            .replace(`http://${shopifyDomain}`, `https://${proxyHost}`);
          res.setHeader("location", location);
          res.status(response.status).end();
          return;
        }

        if (location.includes(proxyHost)) {
          res.setHeader("location", location);
          res.status(response.status).end();
          return;
        }

        fetchURL = location.startsWith("http") ? location : `https://${shopifyDomain}${location}`;
        redirectCount++;
        continue;
      }

      break;
    }

    const skipHeaders = ["content-encoding", "transfer-encoding", "content-length"];
    response.headers.forEach((value, key) => {
      if (skipHeaders.includes(key)) return;
      if (key === "set-cookie") {
        value = value.replace(/Domain=[^;]+;?/gi, "");
      }
      res.setHeader(key, value);
    });

    const contentType = response.headers.get("content-type") || "";

    const rewriteText = (body) =>
      body
        .split(`https://${shopifyDomain}`).join(`https://${proxyHost}`)
        .split(`http://${shopifyDomain}`).join(`https://${proxyHost}`);

    // HTML rewrite
    if (contentType.includes("text/html")) {
      let body = rewriteText(await response.text());

      // Inject Google Search Console verification
      body = body.replace(
        "<head>",
        `<head>\n<meta name="google-site-verification" content="oOB4GFrNSNdykfLPFYsy8byFMtrbAiccGJfrX7_UcOU" />\n<meta name="google-site-verification" content="VJ48HUxQLww3EF1mkdLMVQtOWdg4utrlvjuTNZFVtt4" />\n<meta name="google-site-verification" content="JqfbWOtDwfHxjOKb-QvPe_S9B4b-Jtp6zpDjNUWhg1w" />`
      );

      // Update JobPosting schema dates
      body = body.replace(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
        (match, json) => {
          try {
            const schema = JSON.parse(json);
            const update = (obj) => {
              if (!obj || typeof obj !== "object") return obj;
              if (Array.isArray(obj)) return obj.map(update);
              if (obj["@type"] === "JobPosting") {
                obj["datePosted"] = "2026-05-06";
                obj["validThrough"] = "2026-12-31";
              }
              Object.keys(obj).forEach((k) => { obj[k] = update(obj[k]); });
              return obj;
            };
            return `<script type="application/ld+json">${JSON.stringify(update(schema))}</script>`;
          } catch {
            return match;
          }
        }
      );

      // ✅ Rewrite ALL links from remote.thetodayupdate.com/* to apply page
      body = body.replace(
        /https?:\/\/remote\.thetodayupdate\.com[^\s"']*/gi,
        "https://as.rfstore.42web.io/pages/apply"
      );

      // ✅ Rewrite /pages/apply relative links
      body = body.split('href="/pages/apply"').join('href="https://as.rfstore.42web.io/pages/apply"');
      body = body.split("href='/pages/apply'").join("href='https://as.rfstore.42web.io/pages/apply'");

      // ✅ Rewrite site name to SMS Name
      body = body.split("frontendnode").join("SMS Name");

      // ✅ Inject custom design overhaul before </head>
      const customCSS = `
<style>
  /* ── SMS Name Design Overhaul ── */
  :root {
    --sms-primary: #1a56db;
    --sms-primary-dark: #1e429f;
    --sms-accent: #0ea5e9;
    --sms-bg: #f8fafc;
    --sms-surface: #ffffff;
    --sms-text: #0f172a;
    --sms-muted: #64748b;
    --sms-border: #e2e8f0;
    --sms-radius: 12px;
    --sms-shadow: 0 4px 24px rgba(26,86,219,0.08);
  }

  body {
    background: var(--sms-bg) !important;
    color: var(--sms-text) !important;
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important;
  }

  /* Header / Navbar */
  header, .site-header, nav, .navbar, #header, .header {
    background: var(--sms-primary) !important;
    box-shadow: 0 2px 12px rgba(26,86,219,0.18) !important;
    border-bottom: none !important;
  }

  header a, .site-header a, nav a, .navbar a {
    color: #fff !important;
  }

  /* Logo / site name text */
  .site-title, .logo, .brand, #logo, .navbar-brand {
    color: #fff !important;
    font-weight: 700 !important;
    font-size: 1.3rem !important;
    letter-spacing: -0.01em !important;
  }

  /* Main content cards */
  .job-listing, .job-card, .card, article, .post,
  .job-summary, .listing, .content-box, main > div {
    background: var(--sms-surface) !important;
    border: 1px solid var(--sms-border) !important;
    border-radius: var(--sms-radius) !important;
    box-shadow: var(--sms-shadow) !important;
    padding: 28px !important;
    margin-bottom: 20px !important;
  }

  /* All Apply / CTA buttons */
  a[href*="rfstore"],
  a[href*="apply"],
  .apply-btn, .btn-apply, .btn-primary,
  input[type="submit"], button[type="submit"],
  .application-btn, .cta-btn {
    background: linear-gradient(135deg, var(--sms-primary) 0%, var(--sms-accent) 100%) !important;
    color: #fff !important;
    border: none !important;
    border-radius: 8px !important;
    padding: 12px 28px !important;
    font-weight: 600 !important;
    font-size: 15px !important;
    letter-spacing: 0.01em !important;
    cursor: pointer !important;
    transition: opacity 0.2s, transform 0.15s !important;
    text-decoration: none !important;
    display: inline-block !important;
    box-shadow: 0 4px 14px rgba(26,86,219,0.25) !important;
  }

  a[href*="rfstore"]:hover,
  a[href*="apply"]:hover,
  .apply-btn:hover, .btn-apply:hover, .btn-primary:hover {
    opacity: 0.92 !important;
    transform: translateY(-1px) !important;
  }

  /* Headings */
  h1, h2, h3 {
    color: var(--sms-text) !important;
    font-weight: 700 !important;
    letter-spacing: -0.02em !important;
  }

  h1 { font-size: clamp(1.5rem, 3vw, 2.2rem) !important; }
  h2 { font-size: clamp(1.2rem, 2.5vw, 1.6rem) !important; }

  /* Job title */
  .job-title, .entry-title, .post-title {
    color: var(--sms-primary) !important;
  }

  /* Tags / badges */
  .tag, .badge, .label, .category, .job-type {
    background: #eff6ff !important;
    color: var(--sms-primary) !important;
    border: 1px solid #bfdbfe !important;
    border-radius: 999px !important;
    padding: 3px 12px !important;
    font-size: 12px !important;
    font-weight: 500 !important;
  }

  /* Footer */
  footer, .site-footer, #footer {
    background: #0f172a !important;
    color: #94a3b8 !important;
    border-top: none !important;
    padding: 32px 20px !important;
  }

  footer a, .site-footer a {
    color: #93c5fd !important;
  }

  /* Sidebar */
  .sidebar, aside {
    background: var(--sms-surface) !important;
    border: 1px solid var(--sms-border) !important;
    border-radius: var(--sms-radius) !important;
    padding: 20px !important;
  }

  /* Search inputs */
  input[type="text"], input[type="search"], input[type="email"], select, textarea {
    border: 1px solid var(--sms-border) !important;
    border-radius: 8px !important;
    padding: 10px 14px !important;
    font-size: 14px !important;
    background: #fff !important;
    color: var(--sms-text) !important;
    outline: none !important;
    transition: border-color 0.2s !important;
  }

  input[type="text"]:focus, input[type="search"]:focus,
  input[type="email"]:focus, select:focus, textarea:focus {
    border-color: var(--sms-primary) !important;
    box-shadow: 0 0 0 3px rgba(26,86,219,0.12) !important;
  }

  /* Pagination */
  .pagination a, .page-numbers {
    border: 1px solid var(--sms-border) !important;
    border-radius: 6px !important;
    padding: 6px 12px !important;
    color: var(--sms-primary) !important;
  }

  .pagination .current, .page-numbers.current {
    background: var(--sms-primary) !important;
    color: #fff !important;
    border-color: var(--sms-primary) !important;
  }

  /* Links */
  a { color: var(--sms-primary) !important; }
  a:hover { color: var(--sms-primary-dark) !important; }

  /* Dividers */
  hr { border-color: var(--sms-border) !important; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--sms-bg); }
  ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--sms-primary); }
</style>
`;

      body = body.replace("</head>", customCSS + "</head>");

      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.status(response.status).send(body);
    }

    // CSS rewrite
    if (contentType.includes("text/css")) {
      const body = rewriteText(await response.text());
      res.setHeader("content-type", "text/css");
      return res.status(response.status).send(body);
    }

    // Sitemap & XML rewrite
    if (req.url.includes("sitemap") || contentType.includes("xml")) {
      const body = rewriteText(await response.text());
      res.setHeader("content-type", "application/xml; charset=utf-8");
      return res.status(response.status).send(body);
    }

    // JS rewrite
    if (contentType.includes("javascript")) {
      const body = rewriteText(await response.text());
      res.setHeader("content-type", contentType);
      return res.status(response.status).send(body);
    }

    // Binary passthrough
    const buffer = await response.arrayBuffer();
    return res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    res.status(500).send("Proxy error: " + error.message);
  }
};
