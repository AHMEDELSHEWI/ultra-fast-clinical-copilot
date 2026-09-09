12 4v16M6 14l6 6 6-6"/>',
      microphone: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4M8 22h8"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4"/>',
      more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
    };
    return `<svg class="${esc(className)}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.more}</svg>`;
  }

  function installStyles() {
    if (document.getElementById('v108Styles')) return;
    const style = document.createElement('style');
    style.id = 'v108Styles';
    style.textContent = `
      :root{--topbar:62px;--dock:58px;--v108-fast:48ms;--v108-blue:#0b5fff;--v108-cyan:#00a4bd;--v108-purple:#7657d6;--v108-pink:#d54f8c;--v108-orange:#dc7300;--v108-green:#078a55;--v108-red:#bd1732;--v108-yellow:#8a5a00}
      html{scroll-behavior:auto!important;scroll-padding-top:140px!important}body.v108-ui{background:linear-gradient(180deg,color-mix(in srgb,var(--brand-soft) 40%,var(--bg)) 0,var(--bg) 250px);overflow-x:hidden}
      body.v108-ui *{min-width:0}body.v108-ui .workspace{margin-inline-start:0!important;padding:calc(var(--topbar) + 72px) clamp(12px,2vw,28px) calc(var(--dock) + 54px)!important}
      body.v108-ui .view-container{max-width:1320px;animation:v108Enter var(--v108-fast) ease-out;overflow:visible}
      @keyframes v108Enter{from{opacity:.86;transform:translateY(2px)}to{opacity:1;transform:none}}
      body.v108-ui .topbar{height:var(--topbar);grid-template-columns:minmax(0,1fr) auto;padding:0 clamp(10px,2vw,20px);gap:8px;background:color-mix(in srgb,var(--surface) 92%,transparent);border-bottom-color:color-mix(in srgb,var(--brand) 14%,var(--line))}
      body.v108-ui .topbar__case{display:none!important}body.v108-ui .mobile-only{display:inline-flex!important}
      body.v108-ui .brand-copy strong{font-size:.76rem;letter-spacing:.045em}body.v108-ui .brand-copy span{font-size:.57rem;text-transform:uppercase;letter-spacing:.08em}
      body.v108-ui .brand-mark{width:40px;height:40px;color:#fff;background:linear-gradient(135deg,var(--v108-blue),var(--v108-cyan));border-radius:13px;padding:4px;box-shadow:0 8px 20px rgba(11,95,255,.23);cursor:pointer;transition:transform var(--v108-fast) ease}
      body.v108-ui .brand-mark:hover{transform:translateY(-1px)}body.v108-ui .brand-mark svg rect{opacity:.16}body.v108-ui .topbar__actions{gap:6px}
      body.v108-ui #sideNav{width:min(286px,86vw)!important;transform:translateX(-105%)!important;box-shadow:var(--shadow-lg);border-inline-end:1px solid var(--line);z-index:95}
      [dir="rtl"] body.v108-ui #sideNav{transform:translateX(105%)!important}body.v108-ui #sideNav.open{transform:translateX(0)!important}
      body.v108-ui .side-nav__body{padding:12px 10px 104px}body.v108-ui .side-nav__footer{padding:8px 10px 10px}body.v108-ui .watermark{display:none}
      body.v108-ui .v108-nav-title{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 6px 10px;font-weight:900;font-size:.78rem}
      body.v108-ui .v108-nav-group{display:grid;gap:4px;margin-bottom:10px}body.v108-ui .v108-nav-label{padding:8px 9px 3px;color:var(--ink-faint);font-size:.58rem;font-weight:900;text-transform:uppercase;letter-spacing:.1em}
      body.v108-ui .nav-item{grid-template-columns:34px minmax(0,1fr) auto;min-height:48px;padding:7px 9px;margin:0;border-radius:13px;font-size:.76rem;color:var(--ink-soft)}
      body.v108-ui .nav-item .v108-nav-icon{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:color-mix(in srgb,var(--item-color,var(--brand)) 11%,var(--surface));color:var(--item-color,var(--brand))}
      body.v108-ui .nav-item svg{width:18px;height:18px}body.v108-ui .nav-item.active{background:color-mix(in srgb,var(--item-color,var(--brand)) 10%,var(--surface));color:var(--ink);box-shadow:inset 3px 0 0 var(--item-color,var(--brand))}
      [dir="rtl"] body.v108-ui .nav-item.active{box-shadow:inset -3px 0 0 var(--item-color,var(--brand))}body.v108-ui .nav-item.active .v108-nav-icon{background:var(--item-color,var(--brand));color:#fff}
      body.v108-ui #v108NavScrim{position:fixed;inset:0;z-index:90;background:rgba(7,17,30,.42);backdrop-filter:blur(2px);opacity:0;pointer-events:none;transition:opacity 90ms ease}
      body.v108-ui #