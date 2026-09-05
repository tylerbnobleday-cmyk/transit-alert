import http from "node:http";

const port = 8787;

const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#09090b">
  <title>Ghost</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 20%, #27272a, #09090b 55%); color: #fafafa; }
    main { width: min(90vw, 620px); padding: 48px; border: 1px solid #3f3f46; border-radius: 24px; background: rgba(24,24,27,.82); box-shadow: 0 24px 80px rgba(0,0,0,.45); }
    .mark { font-size: 42px; }
    h1 { margin: 18px 0 8px; font-size: clamp(42px, 10vw, 76px); letter-spacing: -.06em; }
    p { margin: 0; color: #a1a1aa; font-size: 18px; line-height: 1.6; }
    .status { display: inline-flex; align-items: center; gap: 9px; margin-top: 28px; padding: 9px 13px; border: 1px solid #3f3f46; border-radius: 999px; color: #d4d4d8; font-size: 14px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 16px #22c55e; }
  </style>
</head>
<body>
  <main>
    <div class="mark">👻</div>
    <h1>Ghost</h1>
    <p>This server is online. The full Ghost application has not been installed yet.</p>
    <div class="status"><span class="dot"></span> Server connected</div>
  </main>
</body>
</html>`;

http.createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ status: "ok", service: "ghost-placeholder" }));
    return;
  }

  response.writeHead(200, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  });
  response.end(page);
}).listen(port, "127.0.0.1");

