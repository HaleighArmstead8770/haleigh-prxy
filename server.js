const http = require("http");
const https = require("https");

let TARGET = process.env.TARGET_DOMAIN;
const PORT = process.env.PORT || 3000;

if (!TARGET) {
  throw new Error("TARGET_DOMAIN required");
}

// 👉 по умолчанию HTTPS
if (!/^https?:\/\//i.test(TARGET)) {
  TARGET = "https://" + TARGET;
}

const targetUrl = new URL(TARGET);

const server = http.createServer((req, res) => {
  const path = req.url || "/";

  const headers = {
    ...req.headers,
    host: targetUrl.host,
    "x-forwarded-host": req.headers.host,
    "x-forwarded-proto": req.socket.encrypted ? "https" : "http",
    "x-forwarded-for": req.socket.remoteAddress,
  };

  const options = {
    protocol: targetUrl.protocol,
    hostname: targetUrl.hostname,
    port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
    path,
    method: req.method,
    headers,
  };

  const client = targetUrl.protocol === "https:" ? https : http;

  const proxyReq = client.request(options, (proxyRes) => {
    const responseHeaders = { ...proxyRes.headers };

    // 👉 фикс редиректов (чтобы не уводило с прокси)
    if (responseHeaders.location) {
      try {
        const locationUrl = new URL(responseHeaders.location, TARGET);

        if (locationUrl.hostname === targetUrl.hostname) {
          responseHeaders.location =
            locationUrl.pathname +
            locationUrl.search +
            locationUrl.hash;
        }
      } catch (e) {
        // ignore invalid location
      }
    }

    res.writeHead(proxyRes.statusCode || 500, responseHeaders);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    if (!res.headersSent) {
      res.writeHead(502);
    }
    res.end("Bad gateway");
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Proxy running on port ${PORT}`);
  console.log(`Target: ${TARGET}`);
});
