/* ==========================================================================
   UI DECORATIONS, TRANSITIONS & MOTION (js/ui.js)
   ========================================================================== */

// Setup intersection observer for scroll-reveal
const revObs = ("IntersectionObserver" in window) 
  ? new IntersectionObserver(es => {
      es.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          revObs.unobserve(e.target);
        }
      });
    }, { threshold: .06, rootMargin: "0px 0px -4% 0px" })
  : null;

// Trigger scroll reveals in the active page view
export function revealActive() {
  if (!revObs || document.body.dataset.motion === "0") return;
  const v = document.querySelector(".view.active");
  if (!v) return;
  v.querySelectorAll(".proj-idle,.section-title,.section-sub,.mag-feature,.phead,.settings-grid,.shop-grid,.mag-grid").forEach(el => {
    if (el.dataset.rv) return;
    el.dataset.rv = "1";
    el.classList.add("reveal");
    revObs.observe(el);
  });
}

// Particle spawning engine
export function spawnParticles(sel, n) {
  const s = document.querySelector(sel);
  if (!s) return;
  for (let i = 0; i < n; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    p.style.left = Math.random() * 100 + "%";
    p.style.bottom = (-10 + Math.random() * 30) + "%";
    p.style.animationDuration = (10 + Math.random() * 12) + "s";
    p.style.animationDelay = (-Math.random() * 15) + "s";
    p.style.opacity = .3 + Math.random() * .5;
    p.style.transform = `scale(${.5 + Math.random()})`;
    s.appendChild(p);
  }
}

// Initialization of Parallax Background & Card Tilt
export function initMotionEffects() {
  // 3D parallax scroll
  const layers = [...document.querySelectorAll("#scene .hills")];
  let px = 0, py = 0, tx = 0, ty = 0;
  
  document.addEventListener("mousemove", e => {
    if (document.body.dataset.motion === "0") return;
    tx = (e.clientX / window.innerWidth - .5);
    ty = (e.clientY / window.innerHeight - .5);
  });

  (function loop() {
    px += (tx - px) * .06;
    py += (ty - py) * .06;
    layers.forEach(l => {
      const d = parseFloat(l.dataset.depth);
      l.style.transform = `translate(${-px * d * 22}px, ${-py * d * 10}px)`;
    });
    requestAnimationFrame(loop);
  })();

  // Card Tilt motion
  let tActive = null, tLast = null, tcx = 0, tcy = 0, ttx = 0, tty = 0;
  
  document.addEventListener("mousemove", e => {
    if (document.body.dataset.motion === "0") {
      tActive = null;
      ttx = 0;
      tty = 0;
      return;
    }
    const c = e.target.closest(".tilt");
    if (c) {
      tActive = c;
      tLast = c;
      const r = c.getBoundingClientRect();
      ttx = ((e.clientX - r.left) / r.width - .5) * 9;
      tty = -((e.clientY - r.top) / r.height - .5) * 9;
    } else {
      tActive = null;
      ttx = 0;
      tty = 0;
    }
  });

  (function tiltLoop() {
    tcx += (ttx - tcx) * 0.06;
    tcy += (tty - tcy) * 0.06;
    const el = tActive || tLast;
    if (el) {
      const lift = (Math.abs(tcx) + Math.abs(tcy)) > 0.25 ? -5 : 0;
      el.style.transform = `perspective(900px) rotateY(${tcx.toFixed(2)}deg) rotateX(${tcy.toFixed(2)}deg) translateY(${lift}px)`;
      if (!tActive && Math.abs(tcx) < 0.04 && Math.abs(tcy) < 0.04) {
        el.style.transform = "";
        tLast = null;
      }
    }
    requestAnimationFrame(tiltLoop);
  })();

  // Spawn initial background particles
  spawnParticles("#scene", 14);
  spawnParticles(".w-scene", 10);
}
