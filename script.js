(() => {
  'use strict';

  const root = document.documentElement;
  const header = document.getElementById('siteHeader');
  const progress = document.getElementById('progressBar');
  const nav = document.getElementById('mainNav');
  const navToggle = document.getElementById('navToggle');
  const themeToggle = document.getElementById('themeToggle');

  // Theme: keep the visitor's preference.
  const storedTheme = localStorage.getItem('acis-theme');
  if (storedTheme) root.dataset.theme = storedTheme;
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) root.dataset.theme = 'light';

  themeToggle.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    localStorage.setItem('acis-theme', next);
  });

  // Mobile navigation.
  navToggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }));

  // Scroll progress + sticky header.
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
    header.classList.toggle('scrolled', scrollY > 20);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal-on-scroll.
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

  // Highlight active navigation section.
  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...nav.querySelectorAll('a')];
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
    });
  }, { rootMargin: '-35% 0px -55% 0px' });
  sections.forEach(section => sectionObserver.observe(section));

  // Animated statistics.
  let countersStarted = false;
  const stats = document.querySelector('.stats-strip');
  const counterObserver = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting || countersStarted) return;
    countersStarted = true;
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = Number(el.dataset.count);
      const duration = 1100;
      const start = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    counterObserver.disconnect();
  }, { threshold: 0.35 });
  if (stats) counterObserver.observe(stats);

  // Research cards filtering.
  const filterButtons = document.querySelectorAll('.filter-btn');
  const researchCards = document.querySelectorAll('.research-card');
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filterButtons.forEach(b => b.classList.toggle('active', b === button));
    researchCards.forEach(card => {
      const categories = card.dataset.category.split(' ');
      card.classList.toggle('hidden', filter !== 'all' && !categories.includes(filter));
    });
  }));

  // Publication search / filter.
  const search = document.getElementById('pubSearch');
  const pubFilter = document.getElementById('pubFilter');
  const pubs = [...document.querySelectorAll('.publication')];
  const empty = document.getElementById('emptyState');
  const filterPubs = () => {
    const query = search.value.trim().toLowerCase();
    const field = pubFilter.value;
    let shown = 0;
    pubs.forEach(pub => {
      const matchesText = !query || pub.dataset.search.includes(query) || pub.textContent.toLowerCase().includes(query);
      const matchesField = field === 'all' || pub.dataset.field === field;
      const visible = matchesText && matchesField;
      pub.classList.toggle('is-hidden', !visible);
      if (visible) shown++;
    });
    empty.classList.toggle('show', shown === 0);
  };
  search.addEventListener('input', filterPubs);
  pubFilter.addEventListener('change', filterPubs);

  // Animated hero network: no external library required.
  const canvas = document.getElementById('networkCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });
  let particles = [];
  let rafId = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resizeCanvas() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const targetCount = Math.max(28, Math.min(85, Math.floor(rect.width / 18)));
    particles = Array.from({ length: targetCount }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      vx: (Math.random() - .5) * .23,
      vy: (Math.random() - .5) * .23,
      r: Math.random() * 1.4 + .5
    }));
  }

  function drawNetwork() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const light = root.dataset.theme === 'light';
    const node = light ? 'rgba(25,125,150,.44)' : 'rgba(82,231,216,.52)';
    const line = light ? 'rgba(40,100,140,.09)' : 'rgba(100,180,220,.11)';
    ctx.fillStyle = node;
    particles.forEach((p, i) => {
      if (!reducedMotion) { p.x += p.vx; p.y += p.vy; }
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j], dx = p.x-q.x, dy = p.y-q.y, d = Math.hypot(dx,dy);
        if (d < 125) {
          ctx.strokeStyle = line;
          ctx.lineWidth = 1 - d / 160;
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.stroke();
        }
      }
    });
    if (!reducedMotion) rafId = requestAnimationFrame(drawNetwork);
  }

  resizeCanvas();
  drawNetwork();
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { cancelAnimationFrame(rafId); resizeCanvas(); drawNetwork(); }, 180);
  });

  document.getElementById('year').textContent = new Date().getFullYear();
})();
