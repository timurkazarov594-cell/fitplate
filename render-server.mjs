import http from "http";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const API_PORT = Number(process.env.API_PORT || 4000);

const PUBLIC_DIR = path.join(ROOT, "artifacts", "api-server", "public");
const BACKEND_ENTRY = path.join(ROOT, "artifacts", "api-server", "src", "index.ts");

if (!fs.existsSync(path.join(PUBLIC_DIR, "index.html"))) {
  console.error("ERROR: frontend index.html not found in", PUBLIC_DIR);
  process.exit(1);
}

if (!fs.existsSync(BACKEND_ENTRY)) {
  console.error("ERROR: backend entry not found:", BACKEND_ENTRY);
  process.exit(1);
}

console.log("Serving frontend from:", PUBLIC_DIR);
console.log("Starting backend from:", BACKEND_ENTRY);

const backend = spawn("npx", ["--yes", "tsx@4.19.2", BACKEND_ENTRY], {
  cwd: ROOT,
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(API_PORT),
    STATIC_DIR: PUBLIC_DIR,
    PUBLIC_DIR: PUBLIC_DIR
  }
});

backend.on("exit", (code) => {
  console.error("Backend exited with code", code);
});

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function isApiPath(urlPath) {
  return (
    urlPath.startsWith("/api") ||
    urlPath.startsWith("/auth") ||
    urlPath.startsWith("/food-entries") ||
    urlPath.startsWith("/recipes") ||
    urlPath.startsWith("/nutrition") ||
    urlPath.startsWith("/health")
  );
}

function proxyToBackend(req, res) {
  const options = {
    hostname: "127.0.0.1",
    port: API_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxy = http.request(options, (backendRes) => {
    res.writeHead(backendRes.statusCode || 500, backendRes.headers);
    backendRes.pipe(res);
  });

  proxy.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Backend unavailable", details: err.message }));
  });

  req.pipe(proxy);
}

function injectDebug(html) {
  const debugScript = `
<script>
window.addEventListener('error', function(e) {
  document.body.innerHTML =
    '<pre style="white-space:pre-wrap;background:#111;color:#ff5555;padding:24px;font-size:16px;min-height:100vh;">FRONTEND ERROR:\\n' +
    (e.message || '') + '\\n\\n' +
    (e.filename || '') + ':' + (e.lineno || '') + ':' + (e.colno || '') +
    '</pre>';
});
window.addEventListener('unhandledrejection', function(e) {
  document.body.innerHTML =
    '<pre style="white-space:pre-wrap;background:#111;color:#ff5555;padding:24px;font-size:16px;min-height:100vh;">PROMISE ERROR:\\n' +
    ((e.reason && (e.reason.stack || e.reason.message)) || e.reason || 'Unknown error') +
    '</pre>';
});
</script>`;
  return html.replace("</head>", debugScript + "</head>");
}

function serveFrontend(req, res) {
  const cleanUrl = decodeURIComponent((req.url || "/").split("?")[0]);
  let filePath = path.join(PUBLIC_DIR, cleanUrl === "/" ? "index.html" : cleanUrl);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(PUBLIC_DIR, "index.html");
  }

  const ext = path.extname(filePath);

  if (ext === ".html") {
    const html = injectDebug(fs.readFileSync(filePath, "utf8"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  res.writeHead(200, {
    "Content-Type": mime[ext] || "application/octet-stream"
  });

  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  if (isApiPath(urlPath)) {
    proxyToBackend(req, res);
  } else {
    serveFrontend(req, res);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("FitPlate running on port " + PORT);
});
