
const CONFIG = { owner: "3creddy", repo: "dive-center-utilities", branch: "main" };
function b64EncodeUtf8(str){ return btoa(unescape(encodeURIComponent(str))); }
function b64DecodeUtf8(b64){ return decodeURIComponent(escape(atob(b64))); }
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
    if (!res.ok) { const t = await res.text(); throw new Error(`PUT failed: ${res.status} ${t}`); }
    return res.json();
  }
};
function getToken() { return localStorage.getItem("gh_pat") || ""; }
function setToken(t) { localStorage.setItem("gh_pat", t); }
function renderInto(el, text, path){ el.innerHTML = /\.html?$/i.test(path) ? text : (window.marked ? marked.parse(text||"_(blank)_") : text); }
async function loadDoc(docPath, els) {
  els.status.textContent = "Loading…";
  try {
    const meta = await GitHubAPI.getContent(docPath);
    const b = b64DecodeUtf8(meta.content.replace(/\n/g, ""));
    els.currentSha = meta.sha; els.raw.value = b; renderInto(els.view, b, docPath);
    els.status.textContent = "Loaded.";
  } catch(e){ els.status.textContent = "New file. Starting blank."; els.raw.value=""; renderInto(els.view,"<em>(blank)</em>", docPath); els.currentSha=null; console.error(e); }
}
async function saveDoc(docPath, commitMessage, els) {
  const token = getToken(); if(!token){ alert("No GitHub token set. Click 'Set Token' first."); return; }
  els.status.textContent="Saving…";
  try {
    const contentB64 = b64EncodeUtf8(els.raw.value);
    const resp = await GitHubAPI.putContent(docPath, commitMessage, contentB64, els.currentSha, token);
    els.currentSha = resp.content.sha; els.status.textContent="Saved."; renderInto(els.view, els.raw.value, docPath);
  } catch(e){ console.error(e); els.status.textContent="Save failed."; alert("Save failed. See console."); }
}
function wireEditor(docPath, title){
  const els = { title:document.getElementById("title"), status:document.getElementById("status"), token:document.getElementById("token"),
    setTokenBtn:document.getElementById("setToken"), editBtn:document.getElementById("edit"), saveBtn:document.getElementById("save"),
    view:document.getElementById("content"), raw:document.getElementById("editor"), editorWrap:document.getElementById("editorWrap"), currentSha:null };
  if(els.title) els.title.textContent = title; els.token.value = getToken();
  els.setTokenBtn.addEventListener("click", ()=>{ setToken(els.token.value.trim()); els.status.textContent="Token saved locally."; alert("Token saved locally."); });
  els.editBtn.addEventListener("click", ()=>{ const editing = els.editorWrap.style.display==="block"; if(editing){ renderInto(els.view, els.raw.value||"<em>(blank)</em>", docPath); els.editorWrap.style.display="none"; els.editBtn.textContent="Edit"; } else { els.editorWrap.style.display="block"; els.editBtn.textContent="Done"; } });
  els.saveBtn.addEventListener("click", ()=>{ const msg = prompt("Commit message:", "Update SOP"); if(msg!==null) saveDoc(docPath, msg||"Update SOP", els); });
  loadDoc(docPath, els);
}
