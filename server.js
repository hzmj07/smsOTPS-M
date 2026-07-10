const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const PORT = 2022;
const DEFAULT_TOKEN = '1bd63c25cf34eb37d85458575988f2ff7ba41658';

const inbox = [];

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatTimestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method.toUpperCase();
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  // --- Mock SMS API (aman-gate.com compatible) ---
    if (method === 'POST' && (parsed.pathname === '/api/otp/send' || parsed.pathname === '/api/otp/send/')) {
    const body = await parseBody(req);
    const auth = req.headers['authorization'] || '';

    if (!auth.startsWith('Token ') || auth.split(' ')[1] !== DEFAULT_TOKEN) {
      res.writeHead(401, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Invalid or missing token' }));
      return;
    }

    if (!body.gsm) {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'gsm is required' }));
      return;
    }

    const code = body.code || generateOTP();
    const entry = {
      id: inbox.length + 1,
      gsm: body.gsm,
      code,
      template_id: body.template_id || null,
      language: body.language || 1,
      timestamp: formatTimestamp(),
      verified: false,
    };
    inbox.push(entry);

    console.log(`[SMS SIM] OTP sent to ${entry.gsm}: ${code}`);

    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'success',
      message: 'OTP sent successfully (SIMULATION)',
      data: {
        message_id: entry.id,
        gsm: entry.gsm,
      },
    }));
    return;
  }

  // --- Get inbox ---
  if (method === 'GET' && parsed.pathname === '/api/inbox') {
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify(inbox));
    return;
  }

  // --- Verify OTP ---
    if (method === 'POST' && (parsed.pathname === '/api/otp/verify' || parsed.pathname === '/api/otp/verify/')) {
    const body = await parseBody(req);
    const { gsm, code } = body;

    const entry = inbox.find(
      e => e.gsm === gsm && e.code === code && !e.verified
    );

    if (entry) {
      entry.verified = true;
      res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'OTP verified successfully' }));
    } else {
      res.writeHead(400, { ...corsHeaders, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Invalid or expired OTP' }));
    }
    return;
  }

  // --- Clear inbox ---
  if (method === 'POST' && parsed.pathname === '/api/inbox/clear') {
    inbox.length = 0;
    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'Inbox cleared' }));
    return;
  }

  // --- Serve the test page ---
  if (method === 'GET' && parsed.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(getHTML());
    return;
  }

  res.writeHead(404, { ...corsHeaders, 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║        SMS OTP SIMÜLASYON SUNUCUSU          ║
║──────────────────────────────────────────────║
║  Test Sayfası: http://localhost:${PORT}       ║
║  Mock API    : POST /api/otp/send/           ║
║  Token       : ${DEFAULT_TOKEN}               ║
║  Inbox       : GET /api/inbox                ║
║  Verify      : POST /api/otp/verify/         ║
╚══════════════════════════════════════════════╝
`);
});

function getHTML() {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SMS OTP Simülasyon - aman-gate</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; display: flex; justify-content: center; padding: 1rem; }
.container { max-width: 1200px; width: 100%; padding: 1.5rem; }
h1 { text-align: center; font-size: 1.8rem; margin-bottom: 0.5rem; color: #38bdf8; }
.subtitle { text-align: center; color: #64748b; margin-bottom: 2rem; font-size: 0.9rem; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.card { background: #1e293b; border-radius: 12px; padding: 1.5rem; border: 1px solid #334155; }
.card h2 { font-size: 1.1rem; margin-bottom: 1rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.form-group { margin-bottom: 1rem; }
label { display: block; font-size: 0.85rem; margin-bottom: 0.4rem; color: #94a3b8; }
input, select { width: 100%; padding: 0.7rem; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: #e2e8f0; font-size: 0.95rem; outline: none; }
input:focus { border-color: #38bdf8; }
.btn { width: 100%; padding: 0.75rem; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.btn-primary { background: #38bdf8; color: #0f172a; }
.btn-primary:hover { background: #7dd3fc; }
.btn-danger { background: #ef4444; color: white; }
.btn-danger:hover { background: #dc2626; }
.btn-success { background: #10b981; color: white; }
.btn-success:hover { background: #059669; }
.btn-sm { width: auto; padding: 0.4rem 0.8rem; font-size: 0.8rem; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.badge-success { background: #065f46; color: #6ee7b7; }
.badge-warning { background: #92400e; color: #fcd34d; }
.inbox-empty { text-align: center; color: #64748b; padding: 2rem; }
.inbox-item { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; border-bottom: 1px solid #334155; gap: 0.5rem; }
.inbox-item:last-child { border-bottom: none; }
.inbox-gsm { font-weight: 500; min-width: 120px; font-size: 0.9rem; }
.inbox-code { font-family: monospace; font-size: 1.2rem; font-weight: 700; color: #fbbf24; letter-spacing: 0.15em; }
.inbox-time { font-size: 0.75rem; color: #64748b; }
.inbox-meta { font-size: 0.7rem; color: #475569; }
.inbox-actions { display: flex; gap: 0.5rem; align-items: center; }
.inbox-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.inbox-header h2 { margin-bottom: 0; }
.toast { position: fixed; bottom: 1.5rem; right: 1.5rem; padding: 0.8rem 1.2rem; border-radius: 8px; color: white; font-weight: 500; z-index: 100; animation: slideIn 0.3s ease; }
.toast-success { background: #10b981; }
.toast-error { background: #ef4444; }
.toast-info { background: #38bdf8; }
@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.code-display { font-family: monospace; font-size: 2rem; text-align: center; padding: 1rem; background: #0f172a; border-radius: 8px; border: 2px dashed #334155; letter-spacing: 0.3em; margin: 0.5rem 0; }
.curl-box { background: #0f172a; padding: 1rem; border-radius: 8px; font-family: monospace; font-size: 0.8rem; overflow-x: auto; margin-top: 1rem; border: 1px solid #334155; }
.tabs { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.tab { padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.85rem; background: #334155; color: #94a3b8; border: none; }
.tab.active { background: #38bdf8; color: #0f172a; }
.hidden { display: none; }
.api-status { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.8rem; border-radius: 999px; font-size: 0.8rem; background: #065f46; color: #6ee7b7; margin-bottom: 1rem; }
.api-status .dot { width: 8px; height: 8px; border-radius: 50%; background: #6ee7b7; animation: pulse 1.5s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@media (max-width: 768px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="container">
  <h1>SMS OTP Simülasyon</h1>
  <p class="subtitle">aman-gate.com Mock API — Authorization: Token ile çalışır</p>

  <div class="grid">
    <div>
      <div class="card">
        <div class="api-status"><span class="dot"></span> Mock API Çalışıyor</div>
        <div class="tabs">
          <button class="tab active" onclick="showTab('send')">Gönder</button>
          <button class="tab" onclick="showTab('verify')">Doğrula</button>
          <button class="tab" onclick="showTab('curl')">cURL</button>
        </div>

        <div id="tab-send">
          <div class="form-group">
            <label>GSM Numarası (963 ile başlayan)</label>
            <input type="text" id="gsm" value="963911000000" placeholder="963xxxxxxxxx">
          </div>
          <div class="form-group">
            <label>Template ID</label>
            <input type="number" id="templateId" value="1" placeholder="1">
          </div>
          <div class="form-group">
            <label>Kod (boş bırakılırsa rastgele üretilir)</label>
            <input type="text" id="code" maxlength="6" placeholder="123456">
          </div>
          <div class="form-group">
            <label>Dil</label>
            <select id="lang">
              <option value="1">Arapça (1)</option>
              <option value="2">Türkçe (2)</option>
              <option value="3">İngilizce (3)</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="sendOTP()">SMS Gönder (Simüle)</button>
        </div>

        <div id="tab-verify" class="hidden">
          <div class="form-group">
            <label>GSM Numarası</label>
            <input type="text" id="vGsm" value="963911000000" placeholder="963xxxxxxxxx">
          </div>
          <div class="form-group">
            <label>OTP Kodu</label>
            <input type="text" id="vCode" maxlength="6" placeholder="6 haneli kodu gir">
          </div>
          <button class="btn btn-success" onclick="verifyOTP()">OTP Doğrula</button>
        </div>

        <div id="tab-curl" class="hidden">
          <p style="color:#94a3b8;font-size:0.85rem;margin-bottom:0.5rem;">Mock API'ye istek atmak için:</p>
          <div class="curl-box">
curl -X POST http://localhost:${PORT}/api/otp/send/ \\<br>
  -H "Authorization: Token ${DEFAULT_TOKEN}" \\<br>
  -H "Content-Type: application/json" \\<br>
  -d '{<br>
&nbsp;&nbsp;"gsm": "963911000000",<br>
&nbsp;&nbsp;"template_id": 1,<br>
&nbsp;&nbsp;"code": "123456",<br>
&nbsp;&nbsp;"language": 1<br>
  }'
          </div>
          <p style="color:#94a3b8;font-size:0.85rem;margin:1rem 0 0.5rem;">OTP doğrulama:</p>
          <div class="curl-box">
curl -X POST http://localhost:${PORT}/api/otp/verify/ \\<br>
  -H "Content-Type: application/json" \\<br>
  -d '{<br>
&nbsp;&nbsp;"gsm": "963911000000",<br>
&nbsp;&nbsp;"code": "123456"<br>
  }'
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:1rem;">
        <h2>Son Yanıt</h2>
        <pre id="lastResponse" style="background:#0f172a;padding:1rem;border-radius:8px;font-size:0.8rem;overflow-x:auto;min-height:60px;color:#94a3b8;border:1px solid #334155;">Henüz istek yapılmadı...</pre>
      </div>
    </div>

    <div class="card">
      <div class="inbox-header">
        <h2>SMS Inbox</h2>
        <div style="display:flex;gap:0.5rem;">
          <button class="btn btn-sm btn-primary" onclick="refreshInbox()">Yenile</button>
          <button class="btn btn-sm btn-danger" onclick="clearInbox()">Temizle</button>
        </div>
      </div>
      <div id="inbox" style="max-height:500px;overflow-y:auto;">
        <div class="inbox-empty">Henüz SMS yok</div>
      </div>
    </div>
  </div>
</div>

<script>
const TOKEN = '${DEFAULT_TOKEN}';

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.classList.add('hidden'));
  event.target.classList.add('active');
  document.getElementById('tab-' + name).classList.remove('hidden');
}

async function sendOTP() {
  const gsm = document.getElementById('gsm').value.trim();
  if (!gsm) return showToast('GSM numarası gerekli', 'error');

  const body = {
    gsm: gsm,
    template_id: parseInt(document.getElementById('templateId').value) || 1,
    language: parseInt(document.getElementById('lang').value) || 1,
  };
  const code = document.getElementById('code').value.trim();
  if (code) body.code = code;

  try {
    const res = await fetch('/api/otp/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + TOKEN },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    document.getElementById('lastResponse').textContent = JSON.stringify(data, null, 2);
    if (data.status === 'success') {
      showToast('SMS gönderildi! Inbox\'a bak', 'success');
      refreshInbox();
    } else {
      showToast('Hata: ' + data.message, 'error');
    }
  } catch (e) {
    showToast('Bağlantı hatası', 'error');
  }
}

async function verifyOTP() {
  const gsm = document.getElementById('vGsm').value.trim();
  const code = document.getElementById('vCode').value.trim();
  if (!gsm || !code) return showToast('GSM ve kod gerekli', 'error');

  try {
    const res = await fetch('/api/otp/verify/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gsm, code }),
    });
    const data = await res.json();
    document.getElementById('lastResponse').textContent = JSON.stringify(data, null, 2);
    if (data.status === 'success') {
      showToast('OTP doğrulandı!', 'success');
      refreshInbox();
    } else {
      showToast(data.message, 'error');
    }
  } catch (e) {
    showToast('Bağlantı hatası', 'error');
  }
}

async function refreshInbox() {
  try {
    const res = await fetch('/api/inbox');
    const data = await res.json();
    renderInbox(data);
  } catch (e) {}
}

function renderInbox(items) {
  const el = document.getElementById('inbox');
  if (!items.length) {
    el.innerHTML = '<div class="inbox-empty">Henüz SMS yok</div>';
    return;
  }
  el.innerHTML = items.slice().reverse().map(item => \`
    <div class="inbox-item">
      <div>
        <div class="inbox-gsm">\${item.gsm}</div>
        <div class="inbox-time">\${item.timestamp}</div>
        <div class="inbox-meta">template_id: \${item.template_id || '-'} · lang: \${item.language}</div>
      </div>
      <div class="inbox-actions">
        <div>
          <div class="inbox-code">\${item.code}</div>
          <div style="text-align:right;margin-top:2px">
            <span class="badge \${item.verified ? 'badge-success' : 'badge-warning'}">
              \${item.verified ? 'Doğrulandı' : 'Bekliyor'}
            </span>
          </div>
        </div>
        <button class="btn btn-sm btn-success" onclick="fillAndVerify('\${item.gsm}', '\${item.code}')" \${item.verified ? 'disabled style="opacity:0.3"': ''}>
          Kullan
        </button>
      </div>
    </div>
  \`).join('');
}

function fillAndVerify(gsm, code) {
  document.getElementById('vGsm').value = gsm;
  document.getElementById('vCode').value = code;
  showTab('verify');
}

async function clearInbox() {
  if (!confirm('Tüm SMS\'leri temizle?')) return;
  await fetch('/api/inbox/clear', { method: 'POST' });
  refreshInbox();
  showToast('Inbox temizlendi', 'info');
}

function showToast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

setInterval(refreshInbox, 3000);
refreshInbox();
</script>
</body>
</html>`;
}
