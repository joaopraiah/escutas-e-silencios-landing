/* Escutas e Silêncios — interações e animações (vanilla, sem dependências) */
(() => {
  const doc = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- 1. Entrada cinematográfica ---------- */
  const start = () => {
    body.classList.add('is-loaded');
    setTimeout(() => body.classList.add('is-ready'), reduceMotion ? 0 : 650);
    setTimeout(() => { const intro = $('.intro'); intro && intro.remove(); }, 2400);
  };
  if (reduceMotion) {
    body.classList.add('is-loaded', 'is-ready');
  } else {
    const minIntro = new Promise(r => setTimeout(r, 1500));
    const heroImg = $('.hero__photo img');
    const imgReady = heroImg && !heroImg.complete
      ? new Promise(r => { heroImg.addEventListener('load', r, { once: true }); heroImg.addEventListener('error', r, { once: true }); })
      : Promise.resolve();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([Promise.all([minIntro, imgReady, fontsReady]), new Promise(r => setTimeout(r, 3500))]).then(start);
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
  $$('.steps .step').forEach((s, i) => s.style.setProperty('--delay', `${i * 0.08}s`));

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

  /* ---------- 6. Timeline "Como funciona" ---------- */
  const steps = $('[data-steps]');
  const stepFill = steps && $('.steps__fill', steps);
  const stepItems = steps ? $$('.step', steps) : [];

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

    if (steps) {
      const r = steps.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      stepFill.style.setProperty('--p', p.toFixed(3));
      stepItems.forEach(s => s.classList.toggle('is-active', s.getBoundingClientRect().top < vh * 0.6));
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
