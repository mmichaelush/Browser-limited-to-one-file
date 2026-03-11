const byId = (id) => document.getElementById(id);
const statusBox = byId('status');
const payloadPre = byId('payload');
const runBtn = byId('runBtn');
const latestReleaseBtn = byId('latestReleaseBtn');
const latestRunBtn = byId('latestRunBtn');
const latestApkBtn = byId('latestApkBtn');
const rememberTokenBox = byId('remember_token');
const quickLinks = byId('quickLinks');
const apiModeSelect = byId('api_mode');
const apiBaseWrap = byId('api_base_wrap');
const tokenWrap = byId('token_wrap');
const proxyKeyWrap = byId('proxy_key_wrap');

const persistentFields = [
  'owner', 'repo', 'ref', 'api_mode', 'api_base', 'proxy_api_key',
  'request_id', 'app_name', 'application_id', 'content_mode',
  'local_content_path', 'view_mode', 'enable_javascript', 'icon_url'
];

function loadSaved() {
  for (const f of persistentFields) {
    const v = localStorage.getItem(`apk_builder_${f}`);
    if (v !== null) byId(f).value = v;
  }

  const rememberToken = localStorage.getItem('apk_builder_remember_token') === 'true';
  rememberTokenBox.checked = rememberToken;
  if (rememberToken) {
    byId('token').value = localStorage.getItem('apk_builder_token') || '';
  }
}

function saveAll() {
  for (const f of persistentFields) localStorage.setItem(`apk_builder_${f}`, byId(f).value);

  localStorage.setItem('apk_builder_remember_token', String(rememberTokenBox.checked));
  if (rememberTokenBox.checked) {
    localStorage.setItem('apk_builder_token', byId('token').value);
  } else {
    localStorage.removeItem('apk_builder_token');
  }
}

function getInputs() {
  const get = (k) => byId(k).value.trim();
  const inputs = {
    request_id: get('request_id'),
    app_name: get('app_name'),
    application_id: get('application_id'),
    content_mode: get('content_mode'),
    local_content_path: get('local_content_path'),
    view_mode: get('view_mode'),
    enable_javascript: get('enable_javascript') === 'true',
  };

  const icon = get('icon_url');
  if (icon) inputs.icon_url = icon;

  return {
    owner: get('owner'),
    repo: get('repo'),
    ref: get('ref') || 'main',
    token: get('token'),
    apiMode: get('api_mode') || 'direct',
    apiBase: get('api_base'),
    proxyApiKey: get('proxy_api_key'),
    workflowFile: 'build.yaml',
    inputs,
  };
}

function validateConfig(cfg) {
  const errors = [];

  const appIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
  if (!cfg.owner) errors.push('חסר owner');
  if (!cfg.repo) errors.push('חסר repo');
  if (!cfg.inputs.request_id) errors.push('חסר request_id');
  if (!cfg.inputs.app_name || cfg.inputs.app_name.length > 64) errors.push('app_name חסר או ארוך מדי (עד 64)');
  if (!appIdRegex.test(cfg.inputs.application_id)) errors.push('application_id לא תקין');

  if (cfg.apiMode === 'direct' && !cfg.token) errors.push('במצב direct חייבים token');
  if (cfg.apiMode === 'proxy' && !cfg.apiBase) errors.push('במצב proxy חייבים Proxy Base URL');

  const path = cfg.inputs.local_content_path;
  if (!path) {
    errors.push('חסר local_content_path');
  } else {
    if (path.startsWith('/') || path.includes('..')) errors.push('local_content_path חייב להישאר בתוך assets');
    if (cfg.inputs.content_mode === 'HTML' && !path.endsWith('.html')) errors.push('במצב HTML הנתיב חייב להסתיים ב-.html');
    if (cfg.inputs.content_mode === 'PDF' && !path.endsWith('.pdf')) errors.push('במצב PDF הנתיב חייב להסתיים ב-.pdf');
  }

  if (cfg.inputs.icon_url) {
    try { new URL(cfg.inputs.icon_url); } catch { errors.push('icon_url אינו URL תקין'); }
  }

  if (cfg.apiBase) {
    try { new URL(cfg.apiBase); } catch { errors.push('Proxy Base URL אינו URL תקין'); }
  }

  return errors;
}

function renderPayload(p) {
  payloadPre.textContent = JSON.stringify({ ref: p.ref, inputs: p.inputs, api_mode: p.apiMode, proxy_key: p.proxyApiKey ? '<set>' : '<none>' }, null, 2);
}

function renderQuickLinks(cfg) {
  if (!cfg.owner || !cfg.repo) {
    quickLinks.innerHTML = '';
    return;
  }

  const actions = `https://github.com/${cfg.owner}/${cfg.repo}/actions/workflows/${cfg.workflowFile}`;
  const releases = `https://github.com/${cfg.owner}/${cfg.repo}/releases`;
  quickLinks.innerHTML = `קישורים מהירים: <a href="${actions}" target="_blank" rel="noreferrer">Actions</a><a href="${releases}" target="_blank" rel="noreferrer">Releases</a>`;
}

function applyApiModeUI(cfg) {
  const proxy = cfg.apiMode === 'proxy';
  apiBaseWrap.style.display = proxy ? 'block' : 'none';
  tokenWrap.style.display = proxy ? 'none' : 'block';
  proxyKeyWrap.style.display = proxy ? 'block' : 'none';
}

async function githubGet(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status}: ${t}`);
  }
  return res.json();
}

async function openLatestRelease() {
  const cfg = getInputs();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    statusBox.innerHTML = '<span class="err">כדי לקרוא release צריך owner/repo/token (דרך GitHub API).</span>';
    return;
  }

  try {
    statusBox.textContent = 'בודק release אחרון...';
    const data = await githubGet(`/repos/${cfg.owner}/${cfg.repo}/releases/latest`, cfg.token);
    if (data.html_url) {
      window.open(data.html_url, '_blank', 'noopener,noreferrer');
      statusBox.innerHTML = '<span class="ok">נפתח release אחרון ✅</span>';
    } else {
      statusBox.innerHTML = '<span class="err">לא נמצא release.</span>';
    }
  } catch (e) {
    statusBox.innerHTML = `<span class="err">שגיאה בקריאת release:</span> ${e.message}`;
  }
}

async function openLatestRun() {
  const cfg = getInputs();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    statusBox.innerHTML = '<span class="err">כדי לקרוא run צריך owner/repo/token (דרך GitHub API).</span>';
    return;
  }

  try {
    statusBox.textContent = 'בודק run אחרון...';
    const data = await githubGet(`/repos/${cfg.owner}/${cfg.repo}/actions/workflows/${cfg.workflowFile}/runs?per_page=1`, cfg.token);
    const run = data.workflow_runs?.[0];
    if (run?.html_url) {
      window.open(run.html_url, '_blank', 'noopener,noreferrer');
      statusBox.innerHTML = '<span class="ok">נפתח workflow run אחרון ✅</span>';
    } else {
      statusBox.innerHTML = '<span class="err">לא נמצא run.</span>';
    }
  } catch (e) {
    statusBox.innerHTML = `<span class="err">שגיאה בקריאת workflow run:</span> ${e.message}`;
  }
}

function autoAdjustPathByMode() {
  const mode = byId('content_mode').value;
  const pathInput = byId('local_content_path');
  const path = pathInput.value.trim();

  if (mode === 'PDF' && path.endsWith('.html')) pathInput.value = 'content/document.pdf';
  if (mode === 'HTML' && path.endsWith('.pdf')) pathInput.value = 'content/index.html';
}


async function openLatestApkDownload() {
  const cfg = getInputs();
  if (!cfg.owner || !cfg.repo || !cfg.token) {
    statusBox.innerHTML = '<span class="err">כדי למצוא APK צריך owner/repo/token (דרך GitHub API).</span>';
    return;
  }

  try {
    statusBox.textContent = 'מחפש APK אחרון...';
    const data = await githubGet(`/repos/${cfg.owner}/${cfg.repo}/releases/latest`, cfg.token);
    const assets = Array.isArray(data.assets) ? data.assets : [];
    const apk = assets.find(a => (a.name || '').toLowerCase().endsWith('.apk'));
    if (apk?.browser_download_url) {
      window.open(apk.browser_download_url, '_blank', 'noopener,noreferrer');
      statusBox.innerHTML = '<span class="ok">נפתח קישור ההורדה של ה־APK האחרון ✅</span>';
    } else {
      statusBox.innerHTML = '<span class="err">לא נמצא APK ב-release האחרון.</span>';
    }
  } catch (e) {
    statusBox.innerHTML = `<span class="err">שגיאה באיתור APK:</span> ${e.message}`;
  }
}

async function runWorkflow() {
  const cfg = getInputs();
  renderPayload(cfg);
  const errors = validateConfig(cfg);

  if (errors.length > 0) {
    statusBox.innerHTML = `<span class="err">אי אפשר להריץ כרגע:</span><br/>• ${errors.join('<br/>• ')}`;
    return;
  }

  runBtn.disabled = true;
  statusBox.textContent = 'שולח בקשה ל-GitHub Actions...';

  try {
    let res;
    if (cfg.apiMode === 'proxy') {
      const endpoint = `${cfg.apiBase.replace(/\/$/, '')}/dispatch`;
      const headers = { 'Content-Type': 'application/json' };
      if (cfg.proxyApiKey) headers['X-Builder-Key'] = cfg.proxyApiKey;
      res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ owner: cfg.owner, repo: cfg.repo, workflow: cfg.workflowFile, ref: cfg.ref, inputs: cfg.inputs }),
      });
    } else {
      const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/actions/workflows/${cfg.workflowFile}/dispatches`;
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${cfg.token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ref: cfg.ref, inputs: cfg.inputs }),
      });
    }

    if (res.status === 204 || res.ok) {
      statusBox.innerHTML = `<span class="ok">ה־workflow הופעל בהצלחה ✅</span><br/>` +
        `עקוב כאן: https://github.com/${cfg.owner}/${cfg.repo}/actions/workflows/${cfg.workflowFile}`;
    } else {
      const text = await res.text();
      statusBox.innerHTML = `<span class="err">שגיאה (${res.status})</span><br/><pre>${text}</pre>`;
    }
  } catch (e) {
    statusBox.innerHTML = `<span class="err">שגיאת רשת/דפדפן:</span> ${e.message}`;
  } finally {
    runBtn.disabled = false;
    saveAll();
  }
}

function refreshPreview() {
  const cfg = getInputs();
  renderPayload(cfg);
  renderQuickLinks(cfg);
  applyApiModeUI(cfg);

  const errors = validateConfig(cfg);
  if (errors.length > 0) {
    statusBox.innerHTML = `<span class="err">בדיקת קלט:</span><br/>• ${errors.join('<br/>• ')}`;
  } else {
    statusBox.innerHTML = '<span class="ok">הטופס נראה תקין להרצה ✅</span>';
  }
}

loadSaved();
autoAdjustPathByMode();
refreshPreview();

runBtn.addEventListener('click', runWorkflow);
latestReleaseBtn.addEventListener('click', openLatestRelease);
latestRunBtn.addEventListener('click', openLatestRun);
latestApkBtn.addEventListener('click', openLatestApkDownload);
byId('content_mode').addEventListener('change', () => { autoAdjustPathByMode(); refreshPreview(); });
byId('api_mode').addEventListener('change', refreshPreview);

for (const f of [...persistentFields, 'token']) byId(f).addEventListener('input', refreshPreview);
rememberTokenBox.addEventListener('change', () => { saveAll(); refreshPreview(); });
