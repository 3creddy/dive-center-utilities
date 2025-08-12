
const CONFIG = { owner: "3creddy", repo: "dive-center-utilities", branch: "main" };

function b64EncodeUtf8(str){ return btoa(unescape(encodeURIComponent(str))); }
function b64DecodeUtf8(b64){ return decodeURIComponent(escape(atob(b64))); }

// --- Pipe table converter (very small, supports GFM-style | tables) ---
function convertPipeTables(container){
  // Work on text-containing blocks: paragraphs/pre/divs
  const blocks = container.querySelectorAll("p, pre, div");
  blocks.forEach(block => {
    const text = block.textContent;
    if(!text || text.indexOf("|") === -1) return;

    // Detect a table block: header |---| separator and rows
    const tableRegex = /(^|\n)(\|.+\|)\n\|[-:\s|]+\|\n((\|.*\|\n?)+)/g;
    let changed = false;
    const html = text.replace(tableRegex, (_, lead, headerLine, rowsChunk) => {
      function splitRow(line){
        const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
        return inner.split("|").map(c => c.trim());
      }
      const headerCells = splitRow(headerLine);
      const rowLines = rowsChunk.trim().split("\n").map(l => l.trim()).filter(l => l.startsWith("|"));
      const rows = rowLines.map(splitRow);

      let out = '<table class="sop-table"><thead><tr>';
      headerCells.forEach(h => out += `<th>${escapeHtml(h)}</th>`);
      out += '</tr></thead><tbody>';
      rows.forEach(r => {
        out += "<tr>" + r.map(c => `<td>${escapeHtml(c)}</td>`).join("") + "</tr>";
      });
      out += "</tbody></table>";
      changed = true;
      return (lead || "") + out;
    });

    if(changed){
      // Replace the block with HTML
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      block.replaceWith(...wrapper.childNodes);
    }
  });
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  })[m]);
}

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

function getToken() { return localStorage.getItem("gh_pat") || ""; }
function setToken(t) { localStorage.setItem("gh_pat", t); }

function renderInto(el, text, path){
  const isHtml = /\.html?$/i.test(path);
  if(isHtml){
    el.innerHTML = text || "<em>(blank)</em>";
  } else if (window.marked){
    el.innerHTML = marked.parse(text || "_(blank)_");
  } else {
    // naive markdown to preserve newlines
    el.textContent = text || "(blank)";
  }
  // Convert any pipe tables present in the content
  convertPipeTables(el);
}

// --- Load document ---
async function loadDoc(docPath, els) {
  els.status.textContent = "Loading…";
  try {
    const meta = await GitHubAPI.getContent(docPath);
    const b = b64DecodeUtf8(meta.content.replace(/\n/g, ""));
    els.currentSha = meta.sha;
    els.raw.value = b;
    renderInto(els.view, b, docPath);
    els.status.textContent = "Loaded.";
  } catch (e) {
    els.status.textContent = "New file. Starting blank.";
    els.raw.value = "";
    renderInto(els.view, "", docPath);
    els.currentSha = null;
    console.error(e);
  }
}

// --- Save document ---
async function saveDoc(docPath, commitMessage, els) {
  const token = getToken();
  if (!token) { alert("No GitHub token set. Click ‘Set Token’ first."); return; }
  els.status.textContent = "Saving…";
  try {
    const contentB64 = b64EncodeUtf8(els.raw.value);
    const resp = await GitHubAPI.putContent(docPath, commitMessage, contentB64, els.currentSha, token);
    els.currentSha = resp.content.sha;
    els.status.textContent = "Saved.";
    renderInto(els.view, els.raw.value, docPath);
  } catch (e) {
    console.error(e);
    els.status.textContent = "Save failed.";
    alert("Save failed. See console for details.");
  }
}

// --- Wire editor ---
function wireEditor(docPath, title) {
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

  els.setTokenBtn.addEventListener("click", () => {
    setToken(els.token.value.trim());
    els.status.textContent = "Token saved locally.";
    alert("Token saved locally.");
  });

  els.editBtn.addEventListener("click", () => {
    const editing = els.editorWrap.style.display === "block";
    if (editing) {
      renderInto(els.view, els.raw.value || "", docPath);
      els.editorWrap.style.display = "none";
      els.editBtn.textContent = "Edit";
    } else {
      els.editorWrap.style.display = "block";
      els.editBtn.textContent = "Done";
    }
  });

  els.saveBtn.addEventListener("click", () => {
    const msg = prompt("Commit message:", "Update SOP");
    if (msg !== null) saveDoc(docPath, msg || "Update SOP", els);
  });

  loadDoc(docPath, els);
}
