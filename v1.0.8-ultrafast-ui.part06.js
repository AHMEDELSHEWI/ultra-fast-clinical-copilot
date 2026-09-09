lors = {
      dashboard: '#0b5fff', patient: '#00a4bd', complaints: '#d54f8c', assessment: '#7657d6', vitals: '#078a55',
      investigations: '#0d7eaa', reasoning: '#8b5cc7', treatment: '#dc7300', procedures: '#b84d65', disposition: '#4b6cb7',
      documentation: '#006d5b', timeline: '#5d6b7e', calculators: '#6a55c2', library: '#2f7f77', evidence: '#6c737f'
    };
    return colors[routeName] || '#0b5fff';
  }

  function buildShell() {
    if (state.shellBuilt) return;
    installStyles();
    document.body.classList.add('v108-ui');

    const nativeScrollTo = window.scrollTo.bind(window);
    if (!window.__v108ScrollPatched) {
      window.__v108ScrollPatched = true;
      window.scrollTo = function fastScrollTo(first, second) {
        if (first && typeof first === 'object') nativeScrollTo({ ...first, behavior: 'auto' });
        else nativeScrollTo(first, second);
      };
    }

    const brand = document.querySelector('.brand-mark');
    if (brand) {
      brand.setAttribute('role', 'button');
      brand.setAttribute('tabindex', '0');
      brand.setAttribute('title', tr('Home', 'الرئيسية'));
      brand.addEventListener('click', () => app()?.navigate?.('dashboard'));
      brand.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); app()?.navigate?.('dashboard'); } });
    }

    const brandStrong = document.querySelector('.brand-copy strong');
    const brandSub = document.querySelector('.brand-copy span');
    if (brandStrong) brandStrong.textContent = 'CLINICAL COPILOT';
    if (brandSub) brandSub.textContent = 'FAST • FOCUSED • SAFE · V1.0.8';

    const sideBody = document.querySelector('#sideNav .side-nav__body');
    if (sideBody) {
      const main = NAV.filter(item => !item.more);
      const more = NAV.filter(item => item.more);
      const itemHtml = item => `<button class="nav-item" data-route="${esc(item.route)}" style="--item-color:${navColor(item.route)}"><span class="v108-nav-icon">${svg(item.icon)}</span><span>${esc(tr(item.en, item.ar))}</span>${item.route === 'complaints' ? '<span class="nav-count" id="complaintCount">0</span>' : item.route === 'assessment' ? '<span class="nav-count" id="questionCount">0</span>' : ''}</button>`;
      sideBody.innerHTML = `<div class="v108-nav-title"><span>${esc(tr('Clinical workflow', 'المسار السريري'))}</span><small>V1.0.8</small></div><div class="v108-nav-group">${main.map(itemHtml).join('')}</div><div class="v108-nav-label">${esc(tr('More', 'المزيد'))}</div><div class="v108-nav-group">${more.map(itemHtml).join('')}</div>`;
    }

    let scrim = document.getElementById('v108NavScrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.id = 'v108NavScrim';
      document.body.appendChild(scrim);
      scrim.addEventListener('click', () => {
        document.getElementById('sideNav')?.classList.remove('open');
        document.getElementById('menuButton')?.setAttribute('aria-expanded', 'false');
        scrim.classList.remove('open');
      });
    }
    document.getElementById('menuButton')?.addEventListener('click', () => requestAnimationFrame(() => {
      scrim.classList.toggle('open', document.getElementById('sideNav')?.classList.contains('open'));
    }));
    document.addEventListener('click', event => {
      if (event.target.closest?.('#sideNav [data-route]')) scrim.classList.remove('open');
    });

    const dockCopy = document.querySelector('.quick-dock [data-quick="copy"] span:last-child');
    if (dockCopy) dockCopy.textContent = 'COPY ALL';

    state.shellBuilt = true;
  }

  function flowIndex(routeName) {
    return FLOW.findIndex(item => item.route === routeName);
  }

  function enhanceFlowBar() {
    const container = document.querySelector('#viewRoot .view-container');
    if (!container) return;
    const currentRoute = route();
    let bar = container.querySelector('#v108FlowBar');
    if (!bar) {
      bar = document.createElement('nav');
      bar.id = 'v108FlowBar';
      bar.setAttribute('aria-label', tr('Clinical workflow', 'المسار السريري'));
      container.prepend(bar);
    }
    const index = flowIndex(currentRoute);
    const effectiveIndex = index < 0 ? -1 : index;
    const prev = effectiveIndex > 0 ? FLOW[effectiveIndex - 1] : effectiveIndex === 0 ? { route: 'dashboard' } : null;
    const next = effectiveIndex >= 0 && effectiveIndex < FLOW.length - 1 ? FLOW[effectiveIndex + 1] : effectiveIndex < 0 ? FLOW[0] : null;
    const steps = FLOW.map