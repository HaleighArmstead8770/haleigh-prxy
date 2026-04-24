const http = require("http");
const https = require("https");

const TARGET = process.env.TARGET_DOMAIN;
const PORT = process.env.PORT || 3000;

if (!TARGET) {
  throw new Error("TARGET_DOMAIN required");
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

  const proxyReq = (targetUrl.protocol === "https:" ? https : http).request(
    options,
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    }
  );

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
  console.log(`Proxy running on port ${PORT}, target: ${TARGET}`);
});
