// Shiva Shankar S. | portfolio scripts
document.documentElement.classList.add('js');

document.getElementById('year').textContent = new Date().getFullYear();

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

// Theme toggle: remembers the choice, and tells the insulin drawing to recolour
document.getElementById('themeBtn').addEventListener('click', () => {
    const root = document.documentElement;
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) { /* private mode: choice lasts for this visit only */ }
    document.dispatchEvent(new Event('themechange'));
});

// Hero: human insulin (PDB 3I40) as a small rotating C-alpha wireframe with its three disulfide bonds
(() => {
    const canvas = document.getElementById('fold');
    const ctx = canvas.getContext('2d');

    // C-alpha coordinates in angstroms, centred on the molecule. Source: RCSB PDB entry 3I40.
    const CHAINS = [
        [[-7.0,6.7,-2.6],[-4.8,3.7,-1.8],[-7.7,1.3,-1.8],[-8.7,2.3,-5.3],[-5.1,2.1,-6.5],[-4.0,-1.1,-4.8],[-7.0,-3.1,-3.8],[-9.6,-2.4,-6.5],[-6.8,-2.3,-9.0],[-3.3,-3.8,-9.2],[-0.8,-2.2,-6.8],[2.7,-1.1,-7.6],[5.9,-0.3,-5.7],[5.7,3.2,-7.0],[2.3,3.8,-5.5],[3.0,2.1,-2.2],[6.0,4.3,-1.6],[3.8,7.3,-2.0],[2.5,6.3,1.4],[5.7,5.9,3.3],[6.6,8.7,5.8]],
        [[4.9,-9.2,-3.7],[3.7,-5.7,-4.5],[2.4,-6.2,-8.1],[-1.1,-7.6,-7.3],[-4.4,-6.8,-5.8],[-3.7,-6.0,-2.1],[-6.6,-5.4,0.2],[-7.0,-5.1,4.0],[-4.2,-6.8,6.0],[-2.5,-7.7,2.7],[-2.1,-4.0,1.8],[-1.0,-3.0,5.3],[1.6,-5.8,5.2],[3.0,-4.6,1.9],[3.2,-1.0,3.2],[5.0,-2.3,6.2],[7.5,-4.3,4.2],[8.1,-1.6,1.6],[8.4,1.4,3.9],[10.7,-0.1,6.6],[11.8,2.2,9.3],[10.2,5.2,7.5],[6.8,3.8,8.5],[3.7,4.7,6.6],[0.2,6.0,6.7],[-2.8,3.9,5.8],[-5.9,5.8,4.8],[-8.6,3.6,3.3],[-11.3,6.3,3.3],[-9.1,9.2,2.1]]
    ];
    // Disulfides as [chain, residue index, chain, residue index]: A6-A11, A7-B7, A20-B19
    const SS = [[0, 5, 0, 10], [0, 6, 1, 6], [0, 19, 1, 18]];
    const SUB = 6;                                    // curve points per residue

    // Smooth each chain with a Catmull-Rom spline so the backbone reads as a curve, not a zigzag
    const pts = [], segs = [], beads = [], start = [];
    CHAINS.forEach((c, ci) => {
        start[ci] = pts.length;
        for (let i = 0; i < c.length - 1; i++) {
            const p0 = c[Math.max(i - 1, 0)], p1 = c[i], p2 = c[i + 1], p3 = c[Math.min(i + 2, c.length - 1)];
            for (let k = 0; k < SUB; k++) {
                const t = k / SUB, t2 = t * t, t3 = t2 * t;
                pts.push([0, 1, 2].map(d => 0.5 * (2 * p1[d] + (p2[d] - p0[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (3 * p1[d] - p0[d] - 3 * p2[d] + p3[d]) * t3)));
                segs.push({ a: pts.length - 1, b: pts.length, col: ci, width: 2.2 });
            }
        }
        pts.push(c[c.length - 1]);
        c.forEach((_, i) => beads.push({ p: start[ci] + i * SUB, col: ci, r: 1.8 }));
    });
    SS.forEach(([c1, i1, c2, i2]) => {
        const a = start[c1] + i1 * SUB, b = start[c2] + i2 * SUB;
        segs.push({ a, b, col: 2, width: 1.6 });
        beads.push({ p: a, col: 2, r: 3 }, { p: b, col: 2, r: 3 });
    });
    console.assert(pts.length === CHAINS.reduce((n, c) => n + (c.length - 1) * SUB + 1, 0), 'backbone point count is off');

    let w, h, scale, tilt = 0.3, targetTilt = 0.3, colors;
    const readColors = () => {
        const css = getComputedStyle(document.documentElement);
        colors = ['--chain-a', '--chain-b', '--ss'].map(v => css.getPropertyValue(v).trim());
    };
    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = canvas.clientWidth; h = canvas.clientHeight;
        canvas.width = w * dpr; canvas.height = h * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        scale = Math.min(w, h) / 33;
    };

    const draw = (time) => {
        const rot = time * 0.0003;
        tilt += (targetTilt - tilt) * 0.04;
        const cy = Math.cos(rot), sy = Math.sin(rot), cx = Math.cos(tilt), sx = Math.sin(tilt);
        const P = pts.map(([x, y, z]) => {
            const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;      // spin about Y
            const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;     // tilt about X
            const f = 70 / (70 + z2);                                // perspective
            return [w / 2 + x1 * scale * f, h / 2 - y2 * scale * f, z2, f];
        });
        const fade = z => Math.max(0.25, Math.min(1, 0.62 - z / 26));   // far side dims

        ctx.clearRect(0, 0, w, h);
        ctx.lineCap = 'round';
        // paint far things first so near ones overlap them
        const items = segs.map(s => ({ s, z: (P[s.a][2] + P[s.b][2]) / 2 }))
            .concat(beads.map(b => ({ b, z: P[b.p][2] - 0.5 })))
            .sort((m, n) => n.z - m.z);
        for (const { s, b, z } of items) {
            if (s) {
                const A = P[s.a], B = P[s.b];
                ctx.strokeStyle = `rgba(${colors[s.col]},${fade(z)})`;
                ctx.lineWidth = s.width * A[3];
                ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
            } else {
                const A = P[b.p];
                ctx.fillStyle = `rgba(${colors[b.col]},${Math.min(1, fade(z) + 0.15)})`;
                ctx.beginPath(); ctx.arc(A[0], A[1], b.r * A[3], 0, 6.283); ctx.fill();
            }
        }
    };

    readColors(); resize();
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.addEventListener('resize', () => { resize(); if (still) draw(9000); });
    document.addEventListener('themechange', () => { readColors(); if (still) draw(9000); });
    window.addEventListener('pointermove', e => { targetTilt = 0.3 + (e.clientY / window.innerHeight - 0.5) * 0.6; }, { passive: true });

    if (still) { draw(9000); return; }
    const loop = (t) => { draw(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
})();
