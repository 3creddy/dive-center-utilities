
// --- CONFIG: set for your repo ---
console.log("sop.js is loaded and running");
const CONFIG = { owner: "3creddy", repo: "dive-center-utilities", branch: "main" };

// --- GitHub API helper ---
const GitHubAPI = {
  async getContent(path, token=null) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${encodeURIComponent(path)}?ref=${CONFIG.branch}`;
    const res = await fetch(url, { headers: token ? { Authorization: `token ${token}` } : {} });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  },
  async putContent(path, message, contentB64, sha, token) {
    const url = `https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${encodeURIComponent(path)}`;
    const body = { message, content: contentB64, branch: CONFIG.branch };
    if (sha) body.sha = sha;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`PUT failed: ${res.status} ${t}`);
    }
    return res.json();
  }
};

// --- Token helpers ---
function getToken() { return localStorage.getItem("gh_pat") || ""; }
function setToken(t) { localStorage.setItem("gh_pat", t); }

// --- Load document ---
async function loadDoc(mdPath, els) {
  els.status.textContent = "Loading…";
  try {
    const meta = await GitHubAPI.getContent(mdPath);
    const b = atob(meta.content.replace(/\n/g, ""));
    els.currentSha = meta.sha;
    els.raw.value = b;
    els.view.innerHTML = marked.parse(b || "_(blank)_");
    els.status.textContent = "Loaded.";
  } catch (e) {
    els.status.textContent = "New file. Starting blank.";
    els.raw.value = "";
    els.view.innerHTML = marked.parse("_(blank)_");
    els.currentSha = null;
    console.error(e);
  }
}

// --- Save document ---
async function saveDoc(mdPath, commitMessage, els) {
  const token = getToken();
  if (!token) { alert("No GitHub token set. Click ‘Set Token’ first."); return; }
  els.status.textContent = "Saving…";
  try {
    const contentB64 = btoa(unescape(encodeURIComponent(els.raw.value)));
    const resp = await GitHubAPI.putContent(mdPath, commitMessage, contentB64, els.currentSha, token);
    els.currentSha = resp.content.sha;
    els.status.textContent = "Saved.";
  } catch (e) {
    console.error(e);
    els.status.textContent = "Save failed.";
    alert("Save failed. See console for details.");
  }
}

// --- Wire editor ---
function wireEditor(mdPath, title) {
  const els = {
    title: document.getElementById("title"),
    status: document.getElementById("status"),
    token: document.getElementById("token"),
    setTokenBtn: document.getElementById("setToken"),
    editBtn: document.getElementById("edit"),
    saveBtn: document.getElementById("save"),
    view: document.getElementById("content"),
    raw: document.getElementById("editor"),
    editorWrap: document.getElementById("editorWrap"),
    currentSha: null
  };

  if (els.title) els.title.textContent = title;
  els.token.value = getToken();

  console.log("Attaching Set Token click listener");
els.setTokenBtn.addEventListener("click", () => {
  console.log("Set Token button clicked");
  alert("Token save function triggered");
    setToken(els.token.value.trim());
    els.status.textContent = "Token saved locally.";
    alert("Token saved locally.");
  });

  els.editBtn.addEventListener("click", () => {
    const editing = els.editorWrap.style.display === "block";
    if (editing) {
      els.view.innerHTML = marked.parse(els.raw.value || "_(blank)_");
      els.editorWrap.style.display = "none";
      els.editBtn.textContent = "Edit";
    } else {
      els.editorWrap.style.display = "block";
      els.editBtn.textContent = "Done";
    }
  });

  els.saveBtn.addEventListener("click", () => {
    const msg = prompt("Commit message:", "Update SOP");
    if (msg !== null) saveDoc(mdPath, msg || "Update SOP", els);
  });

  loadDoc(mdPath, els);
}
