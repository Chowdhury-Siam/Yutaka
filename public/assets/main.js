(() => {
  const config = window.YUTAKA_SITE || {};
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
  const stores = { play: config.playStoreUrl, microsoft: config.microsoftStoreUrl };
  document.querySelectorAll('[data-store]').forEach(link => {
    const url = stores[link.dataset.store];
    if (typeof url === 'string' && /^https:\/\//.test(url)) {
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.removeAttribute('aria-disabled');
      link.removeAttribute('hidden');
      link.querySelector('.download-status').textContent = '↗';
    } else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
  });
  if (/^https:\/\//.test(config.githubUrl || '')) {
    document.querySelectorAll('[data-github], #github-link').forEach(link => { link.href = config.githubUrl; });
  }
  const nav = document.getElementById('nav-wrap');
  if (nav) {
    let wasScrolled;
    const updateNav = () => {
      const scrolled = window.scrollY > 24;
      if (scrolled !== wasScrolled) {
        nav.classList.toggle('scrolled', scrolled);
        wasScrolled = scrolled;
      }
    };
    updateNav(); window.addEventListener('scroll', updateNav, { passive: true });
  }
  const menu = document.getElementById('platform-menu');
  if (menu) {
    menu.open = false;
    const summary = menu.querySelector('summary');
    let drawerAnimation;
    let contentAnimations = [];
    const cancelContent = () => {
      contentAnimations.forEach(animation => animation.cancel());
      contentAnimations = [];
    };
    const setMenuOpen = open => {
      // Native details still works when animation APIs or JavaScript are unavailable.
      if (!menu.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        drawerAnimation?.cancel();
        cancelContent();
        drawerAnimation = null;
        menu.classList?.remove('is-closing');
        menu.open = open;
        return;
      }
      const start = menu.getBoundingClientRect();
      const startRadius = window.getComputedStyle?.(menu).borderRadius || (menu.open ? '20px' : '999px');
      drawerAnimation?.cancel();
      cancelContent();
      menu.classList.remove('is-closing');
      if (open) menu.open = true;
      const end = open ? menu.getBoundingClientRect() : { width: menu.parentElement.clientWidth, height: summary.getBoundingClientRect().height + 2 };
      if (!open) menu.classList.add('is-closing');
      const animation = menu.animate([
        { width: `${start.width}px`, height: `${start.height}px`, borderRadius: startRadius },
        { width: `${end.width}px`, height: `${end.height}px`, borderRadius: open ? '20px' : '999px' },
      ], { duration: open ? 400 : 280, easing: 'cubic-bezier(.32,.72,0,1)' });
      drawerAnimation = animation;
      const panel = menu.querySelector('.download-panel');
      if (panel?.animate) contentAnimations.push(panel.animate(open ? [
        { opacity: 0, transform: 'translateY(-8px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ] : [{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-6px)' }], {
        duration: open ? 320 : 120, delay: open ? 90 : 0,
        easing: 'cubic-bezier(.32,.72,0,1)', fill: open ? 'backwards' : 'both',
      }));
      const cards = menu.querySelectorAll?.('.platform-card') || [];
      cards.forEach((card, index) => {
        if (card.animate) contentAnimations.push(card.animate(open ? [
          { opacity: 0, transform: 'translateY(8px) scale(.98)' },
          { opacity: 1, transform: 'translateY(0) scale(1)' },
        ] : [{ opacity: 1, transform: 'translateY(0) scale(1)' }, { opacity: 0, transform: 'translateY(4px) scale(.98)' }], {
          duration: open ? 280 : 110, delay: open ? 100 + index * 50 : 0,
          easing: 'cubic-bezier(.32,.72,0,1)', fill: open ? 'backwards' : 'both',
        }));
      });
      animation.finished.then(() => {
        menu.open = open;
        menu.classList.remove('is-closing');
        drawerAnimation = null;
        if (!open) cancelContent();
        if (open) {
          const bounds = menu.getBoundingClientRect();
          if (bounds.bottom > window.innerHeight - 20 || bounds.top < 96) {
            menu.scrollIntoView({ block: 'start', behavior: 'smooth' });
          }
        }
      }).catch(() => {}); // A new toggle cancels the previous animation.
    };
    summary.addEventListener('click', event => {
      event.preventDefault();
      setMenuOpen(!menu.open || menu.classList.contains('is-closing'));
    });
    document.querySelectorAll('[data-download-trigger]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      menu.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      summary.focus({ preventScroll: true });
      window.history.replaceState(null, '', '#downloads');
    }));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) { setMenuOpen(false); summary.focus({ preventScroll: true }); }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target) && !event.target.closest('[data-download-trigger]')) setMenuOpen(false);
    });
  }
  document.querySelectorAll('.faq-list details').forEach(item => {
    const summary = item.querySelector('summary');
    let animation;
    summary.addEventListener('click', event => {
      event.preventDefault();
      const opening = !item.open || item.classList.contains('is-closing');
      const startHeight = item.getBoundingClientRect().height;
      animation?.cancel();
      item.classList.remove('is-closing');
      if (!item.animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        item.open = opening;
        animation = null;
        return;
      }
      if (opening) item.open = true;
      const endHeight = opening ? item.getBoundingClientRect().height : summary.getBoundingClientRect().height + 1;
      if (!opening) item.classList.add('is-closing');
      animation = item.animate([{ height: `${startHeight}px` }, { height: `${endHeight}px` }], {
        duration: opening ? 280 : 220, easing: 'cubic-bezier(.32,.72,0,1)',
      });
      animation.finished.then(() => {
        item.open = opening;
        item.classList.remove('is-closing');
        animation = null;
      }).catch(() => {});
    });
  });
  const hero = document.getElementById('top');
  const stage = hero?.querySelector('.product-stage');
  if (stage) {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = null;
    let geometryDirty = true;
    let heroTop = 0, heroRange = 1;
    let inView = true;
    let lastProgress;
    const updateLayers = () => stage.classList.toggle('hero-motion-active', inView && !document.hidden && !motionPreference.matches);
    const updateHero = () => {
      frame = null;
      if (document.hidden) return;
      // Read layout only after a size change, never on ordinary scroll frames.
      if (geometryDirty) {
        const bounds = hero.getBoundingClientRect();
        heroTop = bounds.top + window.scrollY;
        heroRange = Math.max(1, bounds.height * .75);
        geometryDirty = false;
      }
      const progress = motionPreference.matches ? 0 : Math.max(0, Math.min(1, (window.scrollY - heroTop) / heroRange));
      const value = progress.toFixed(4);
      if (value !== lastProgress) {
        // Keep the inherited value inside the artwork, away from the download UI.
        stage.style.setProperty('--hero-progress', value);
        lastProgress = value;
      }
    };
    const queueHero = () => {
      if (!document.hidden && inView && !motionPreference.matches && frame === null) {
        frame = window.requestAnimationFrame(updateHero);
      }
    };
    const refreshGeometry = () => { geometryDirty = true; queueHero(); };
    updateHero();
    updateLayers();
    window.addEventListener('scroll', queueHero, { passive: true });
    window.addEventListener('resize', refreshGeometry);
    // Fonts and image loading can resize the hero without a window resize.
    if (typeof ResizeObserver === 'function') new ResizeObserver(refreshGeometry).observe(hero);
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        updateLayers();
        if (inView) queueHero();
        else if (frame !== null) { window.cancelAnimationFrame(frame); frame = null; }
      }, { rootMargin: '100px' }).observe(hero);
    }
    motionPreference.addEventListener('change', () => {
      if (frame !== null) { window.cancelAnimationFrame(frame); frame = null; }
      updateLayers();
      updateHero();
    });
    document.addEventListener('visibilitychange', () => {
      updateLayers();
      if (document.hidden && frame !== null) { window.cancelAnimationFrame(frame); frame = null; }
      else refreshGeometry();
    });
  }
  // Progressive enhancement: without JavaScript, all content stays visible.
  if (typeof IntersectionObserver === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.documentElement.classList.add('motion-ready');
    document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
  }
})();
