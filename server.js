const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { URL } = require("url");

const app = express();
const PORT = 3000;

const CSV_DIR = path.join(__dirname, "csv");
if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR, { recursive: true });

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Generic HTTP(S) proxy helper ──────────────────────────────
function apiRequest(method, targetUrl, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const lib = parsed.protocol === "https:" ? https : http;

    const options = {
      method,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers,
      timeout: 15000,
    };

    const req = lib.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, json: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, json: null, raw: data });
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Request timed out")); });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Escape a CSV cell ─────────────────────────────────────────
function csvEscape(val) {
  const s = String(val ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function normalizeBaseUrl(raw) {
  // strip trailing slashes/spaces
  let url = raw.replace(/\/+$/, "").trim();

  // if they pasted a full endpoint path like .../v1/models or .../v1/chat/completions
  // strip everything after /v1
  const v1Match = url.match(/(\/v1)$/i);
  if (v1Match) {
    return url;                          // already has /v1 at the end
  }

  // check for /v1 followed by something else (overpaste)
  const v1Mid = url.match(/(\/v1)\/.+/i);
  if (v1Mid) {
    return url.replace(/\/v1\/.+/i, "/v1");
  }

  // no /v1 anywhere — append it
  return url + "/v1";
}

// ── POST /api/fetch ───────────────────────────────────────────
app.post("/api/fetch", async (req, res) => {
  const { baseUrl, apiKey, mode, manualModelId } = req.body;

  if (!baseUrl || !apiKey) {
    return res.status(400).json({ error: "URL and API key are required." });
  }

  const cleanBase = normalizeBaseUrl(baseUrl);
  const authHeader = { Authorization: `Bearer ${apiKey}` };

  try {
    let models = [];      // array of { id, owned_by, created }
    let fetchTime = new Date().toISOString();

    if (mode === "list") {
      const result = await apiRequest("GET", `${cleanBase}/models`, authHeader);
      if (result.status !== 200) {
        return res.status(result.status).json({ error: `Upstream returned ${result.status}`, detail: result.json || result.raw });
      }
      models = (result.json.data || []).map((m) => ({
        id: m.id,
        owned_by: m.owned_by || "",
        created: m.created || "",
      }));
    } else {
      // single model
      const modelId = manualModelId || "";
      if (!modelId) {
        return res.status(400).json({ error: "Provide a model ID." });
      }
      const result = await apiRequest("GET", `${cleanBase}/models/${encodeURIComponent(modelId)}`, authHeader);
      if (result.status !== 200) {
        return res.status(result.status).json({ error: `Upstream returned ${result.status}`, detail: result.json || result.raw });
      }
      const m = result.json;
      models = [{ id: m.id, owned_by: m.owned_by || "", created: m.created || "" }];
    }

    // ── Write CSV ─────────────────────────────────────────────
    const ts = fetchTime.replace(/[:.]/g, "-").slice(0, 19);
    const csvFile = path.join(CSV_DIR, `models_${ts}.csv`);
    const header = "fetch_time,model_id,owned_by,created\n";
    const rows = models
      .map((m) => [fetchTime, m.id, m.owned_by, m.created].map(csvEscape).join(","))
      .join("\n");
    fs.writeFileSync(csvFile, header + rows + "\n", "utf-8");

    res.json({
      count: models.length,
      csvFile: path.basename(csvFile),
      models,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Model Fetcher running http://localhost:${PORT}  CSVs saved to  → ${CSV_DIR}`);
});