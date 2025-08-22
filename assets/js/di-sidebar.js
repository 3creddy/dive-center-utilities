
(function(){
  async function injectSidebar(){
    const host = document.getElementById("di-sidebar-host");
    if(!host) return;
    try{
      const resp = await fetch("/partials/sidebar.html").catch(()=>fetch("../partials/sidebar.html"));
      if(!resp || !resp.ok) return;
      const html = await resp.text();
      host.innerHTML = html;
      // Active link highlight
      const here = location.pathname.replace(/\/index\.html$/, "/");
      document.querySelectorAll(".di-link").forEach(a=>{
        const href = a.getAttribute("href");
        if(!href) return;
        try{
          const url = new URL(href, location.origin);
          const path = url.pathname.replace(/\/index\.html$/, "/");
          if(here === path){ a.classList.add("active"); }
        }catch(e){}
      });
    }catch(e){ /* noop */ }
  }
  function setupToggle(){
    const btn = document.getElementById("di-toggle");
    if(!btn) return;
    btn.addEventListener("click", ()=>{
      document.documentElement.classList.toggle("di-collapsed");
    });
  }
  injectSidebar();
  setupToggle();
})();
