/* Escutas e Silêncios — interações e animações (vanilla, sem dependências) */
(() => {
  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- 1. Entrada cinematográfica ---------- */
  // letras do nome surgem uma a uma
  $$('[data-letters]').forEach(el => {
    const text = el.textContent; el.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'ch' + (ch === '&' ? ' amp' : '');
      span.style.setProperty('--i', i);
      span.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(span);
    });
  });
  const start = () => {
    body.classList.add('is-loaded');
    setTimeout(() => body.classList.add('is-ready'), reduceMotion ? 0 : 900);
    setTimeout(() => { const intro = $('.intro'); intro && intro.remove(); }, 3000);
  };
  if (reduceMotion) {
    body.classList.add('is-loaded', 'is-ready');
  } else {
    // contador acompanha o carregamento real (imagens do topo + fontes), com duração mínima
    const countEl = $('[data-count]');
    const barEl = $('[data-bar]');
    const tasks = [...$$('.hero img, .header img')].filter(i => !i.complete)
      .map(img => new Promise(r => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }));
    if (document.fonts) tasks.push(document.fonts.ready);
    let done = 0; const total = Math.max(tasks.length, 1);
    tasks.forEach(t => t.then(() => done++));
    const t0 = performance.now(); const minT = 2300, maxT = 5000;
    let shown = 0;
    const tick = (now) => {
      const el = now - t0;
      const real = tasks.length ? done / total : 1;
      const target = Math.min(real, el / minT) * 100;
      shown += (target - shown) * 0.12;
      if (target === 100 && shown > 99.4) shown = 100;
      countEl.textContent = Math.round(shown);
      barEl.style.transform = `scaleX(${shown / 100})`;
      if (shown >= 100 || el > maxT) { countEl.textContent = 100; barEl.style.transform = 'scaleX(1)'; setTimeout(start, 250); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- 2. Reveal na rolagem ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('.reveal, [data-observe]').forEach(el => io.observe(el));

  // stagger dos cards de identificação
  $$('.cards .card').forEach((c, i) => c.style.setProperty('--delay', `${(i % 3) * 0.12 + Math.floor(i / 3) * 0.05}s`));

  /* ---------- 3. Header: estado ao rolar + esconder ao descer ---------- */
  const header = $('.header');
  const waFloat = $('.wa-float');
  let lastY = window.scrollY;

  /* ---------- 4. Marquee: duplica conteúdo e pausa fora da tela ---------- */
  $$('.marquee').forEach(m => {
    const track = $('.marquee__track', m);
    const group = $('.marquee__group', track);
    track.appendChild(group.cloneNode(true));
    new IntersectionObserver(([e]) => m.classList.toggle('is-offscreen', !e.isIntersecting)).observe(m);
  });

  /* ---------- 5. Manifesto: palavras acendem conforme a leitura ---------- */
  const wordsEl = $('[data-words]');
  let words = [];
  if (wordsEl) {
    const wrap = (node) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(wordsEl);
    words = $$('.w', wordsEl);
  }

  /* ---------- 6. Passo a passo guiado pela rolagem ---------- */
  const proc = $('[data-process]');
  const procImgs = proc ? $$('.pimg', proc) : [];
  const procSteps = proc ? $$('.pstep', proc) : [];
  const procBars = proc ? $$('.processo__bars button', proc) : [];
  const procDigit = proc && $('[data-digit]', proc);
  let procActive = -1;
  const setProc = (idx) => {
    if (idx === procActive) return;
    procActive = idx;
    const apply = (els) => els.forEach((el, i) => {
      el.classList.toggle('is-active', i === idx);
      el.classList.toggle('is-before', i < idx);
    });
    apply(procImgs); apply(procSteps);
    procBars.forEach((b, i) => b.setAttribute('aria-selected', String(i === idx)));
    procDigit.style.setProperty('--active', idx);
  };
  if (proc) {
    setProc(0);
    procBars.forEach((b, i) => b.addEventListener('click', () => {
      const dist = proc.offsetHeight - window.innerHeight;
      window.scrollTo({ top: proc.offsetTop + dist * ((i + 0.15) / procBars.length), behavior: reduceMotion ? 'auto' : 'smooth' });
    }));
  }

  /* ---------- Cards empilhados no mobile ---------- */
  const stackCards = $$('.cards .card');
  const mqMobile = window.matchMedia('(max-width: 899px)');

  /* ---------- 7. Parallax ---------- */
  const parallax = $$('[data-parallax]');

  /* ---------- Loop de rolagem único (rAF) ---------- */
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const vh = window.innerHeight;

    header.classList.toggle('is-scrolled', y > 24);
    if (!body.classList.contains('menu-open')) header.classList.toggle('is-hidden', y > lastY && y > 520);
    lastY = y;
    waFloat.classList.toggle('is-visible', y > vh * 0.8);

    if (words.length) {
      const r = wordsEl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      const lit = Math.round(p * words.length);
      words.forEach((w, i) => w.classList.toggle('is-on', i < lit));
    }

    if (proc) {
      const r = proc.getBoundingClientRect();
      const dist = r.height - vh;
      const p = Math.min(0.9999, Math.max(0, -r.top / dist));
      const n = procSteps.length;
      const idx = Math.floor(p * n);
      setProc(idx);
      procBars.forEach((b, i) => b.querySelector('span').style.setProperty('--fill', Math.min(1, Math.max(0, p * n - i)).toFixed(3)));
    }

    if (mqMobile.matches && !reduceMotion) {
      stackCards.forEach((card, i) => {
        const next = stackCards[i + 1];
        const inner = card.firstElementChild;
        if (!next) { inner.style.transform = ''; inner.style.filter = ''; return; }
        const r = card.getBoundingClientRect();
        const nr = next.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (r.bottom - nr.top) / r.height));
        inner.style.transform = p ? `scale(${(1 - p * 0.07).toFixed(4)})` : '';
        inner.style.filter = p ? `brightness(${(1 - p * 0.3).toFixed(3)})` : '';
      });
    }

    if (!reduceMotion) {
      parallax.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / (vh + r.height);
        el.style.transform = `translate3d(0, ${(p * -14).toFixed(2)}%, 0)`;
      });
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- 8. Menu mobile ---------- */
  const burger = $('.burger');
  const menu = $('#menu-mobile');
  const setMenu = (open) => {
    body.classList.toggle('menu-open', open);
    body.classList.toggle('is-locked', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.setAttribute('aria-hidden', String(!open));
    header.classList.remove('is-hidden');
  };
  burger.addEventListener('click', () => setMenu(!body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- 9. Cards: tilt + luz que segue o cursor ---------- */
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach(card => {
      card.addEventListener('pointermove', e => {
        card.style.transition = 'transform .25s ease-out, border-color .6s, background .6s';
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', `${x * 100}%`);
        card.style.setProperty('--my', `${y * 100}%`);
        card.style.transform = `perspective(900px) rotateX(${(0.5 - y) * 5}deg) rotateY(${(x - 0.5) * 6}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => {
        card.style.transition = 'transform .9s cubic-bezier(.16,1,.3,1), border-color .6s, background .6s';
        card.style.transform = '';
      });
    });

    /* ---------- 10. CTA magnético (sutil) ---------- */
    $$('[data-magnetic]').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = `translate(${dx * 0.12}px, ${dy * 0.22}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.transform = ''; });
    });
  }

  /* ---------- 11. Slider de depoimentos ---------- */
  const track = $('[data-slider]');
  if (track) {
    const prog = $('[data-slider-progress]');
    const step = () => (track.querySelector('.quote-card')?.offsetWidth || 300) + 14;
    $('[data-slider-prev]').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
    $('[data-slider-next]').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = track.clientWidth / track.scrollWidth;
      const p = max > 0 ? track.scrollLeft / max : 0;
      prog.style.width = `${ratio * 100}%`;
      prog.style.transform = `translateX(${p * (1 / ratio - 1) * 100}%)`;
    };
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- 12. FAQ com abertura animada (acordeão) ---------- */
  const faqs = $$('.faq-item');
  const closeFaq = (d) => {
    d.classList.remove('is-open');
    const body = $('.faq-item__body', d);
    const done = () => { if (!d.classList.contains('is-open')) d.open = false; };
    reduceMotion ? done() : body.addEventListener('transitionend', done, { once: true });
  };
  faqs.forEach(d => {
    $('summary', d).addEventListener('click', e => {
      e.preventDefault();
      if (d.classList.contains('is-open')) { closeFaq(d); return; }
      faqs.forEach(o => o !== d && o.classList.contains('is-open') && closeFaq(o));
      d.open = true;
      requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
    });
  });

  /* ---------- Ano no rodapé ---------- */
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
