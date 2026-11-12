// Shiva Shankar S. | portfolio scripts
document.documentElement.classList.add('js');

document.getElementById('year').textContent = new Date().getFullYear();

// Stagger the peptide tiles
document.querySelectorAll('.peptide li').forEach((li, i) => li.style.setProperty('--i', i));

// Scroll reveal
const reveal = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); reveal.unobserve(e.target); } });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

// Highlight the current section in the nav
const links = document.querySelectorAll('.nav nav a');
const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
        if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
    });
}, { rootMargin: '-45% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(s => spy.observe(s));

// Cursor spotlight on work cards
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
});

// Theme toggle: remembers the choice
document.getElementById('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* private mode: choice lasts for this visit only */ }
});

// Hero: a made-up sequence being redesigned letter by letter, cysteines held fixed (the inverse-folding idea, not real data)
(() => {
    const NATIVE = 'MKTLAECLRSAVGNPDQCIEHWLKTRGYFASPVECLNDMKQAHCGSEW';
    const AA = 'ADEFGHIKLMNPQRSTVWY';                 // no C: designs never add or remove a cysteine
    const ROUND = 16;                                 // residues changed before the card resets
    console.assert(NATIVE.length === 48, 'sequence must fill the 12 x 4 grid');
    const box = document.getElementById('seq'), stat = document.getElementById('seqStat');
    const cells = [...NATIVE].map(ch => {
        const el = document.createElement('span');
        if (ch === 'C') el.className = 'lock';
        return box.appendChild(el);
    });
    let changed = 0;
    const reset = () => { changed = 0; cells.forEach((el, i) => { el.textContent = NATIVE[i]; el.classList.remove('mut'); }); show(); };
    const show = () => { stat.textContent = changed + ' / ' + NATIVE.length + ' redesigned'; };
    const mutate = () => {
        const open = cells.filter(el => !el.className);       // not locked, not yet changed
        const el = open[Math.floor(Math.random() * open.length)];
        let aa; do { aa = AA[Math.floor(Math.random() * AA.length)]; } while (aa === el.textContent);
        el.textContent = aa; el.classList.add('mut'); changed++; show();
    };
    reset();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { for (let i = 0; i < ROUND; i++) mutate(); return; }
    let rest = 0;                                     // ticks to hold the finished design before starting over
    setInterval(() => {
        if (changed < ROUND) return mutate();
        if (++rest > 4) { rest = 0; reset(); }
    }, 650);
})();
