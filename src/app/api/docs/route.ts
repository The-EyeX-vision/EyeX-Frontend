/**
 * GET /api/docs
 * Serves an interactive Swagger UI for EyeX Backend APIs.
 * Uses official Swagger UI standalone bundle via CDN — zero dependencies.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>EyeX API Documentation — Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" type="image/jpeg" href="/fav.jpeg" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #0b0f17;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    .topbar {
      display: none;
    }
    .eyex-header {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .eyex-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
      font-weight: 700;
      color: #38bdf8;
    }
    .eyex-badge {
      background: #0284c7;
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    .swagger-ui .info .title {
      color: #f8fafc;
    }
    .swagger-ui .info p, .swagger-ui .info li {
      color: #94a3b8;
    }
    .swagger-ui .scheme-container {
      background: #0f172a;
      box-shadow: none;
      border-bottom: 1px solid #1e293b;
    }
    .swagger-ui .opblock {
      border-radius: 8px;
    }
    .swagger-ui .opblock .opblock-summary-operation-id,
    .swagger-ui .opblock .opblock-summary-path,
    .swagger-ui .opblock .opblock-summary-description {
      color: #e2e8f0;
    }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th {
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="eyex-header">
    <div class="eyex-brand">
      <span>EyeX Live Monitoring</span>
      <span class="eyex-badge">Backend API v1.0</span>
    </div>
    <div>
      <a href="/api/openapi.json" target="_blank" style="color: #38bdf8; text-decoration: none; font-size: 13px; font-weight: 500;">
        Raw OpenAPI Spec (JSON) &rarr;
      </a>
    </div>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" charset="UTF-8"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}
