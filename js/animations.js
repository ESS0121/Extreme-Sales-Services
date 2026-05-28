/**
 * animations.js — Shared animation layer for Extreme S&S
 * Handles: scroll-reveal, 3D card tilt, number counters,
 *          cursor spotlight, particle hero dots.
 */

(function () {
  'use strict';

  /* ─── 1. Scroll Reveal ────────────────────────────────── */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document
    .querySelectorAll('.reveal, .reveal-stagger, .reveal-left, .reveal-right')
    .forEach((el) => revealObserver.observe(el));

  /* ─── 2. Step connector lines ─────────────────────────── */
  document.querySelectorAll('.step-connector').forEach((el) => {
    revealObserver.observe(el);
  });

  /* ─── 3. Number Counter ───────────────────────────────── */
  function animateCounter(el) {
    const target   = parseInt(el.dataset.target, 10);
    const suffix   = el.dataset.suffix || '';
    const duration = 1500;
    const start    = performance.now();

    const update = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  document
    .querySelectorAll('[data-target]')
    .forEach((el) => counterObserver.observe(el));

  /* ─── 4. 3D Card Tilt ────────────────────────────────── */
  document.querySelectorAll('.card-3d').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect   = card.getBoundingClientRect();
      const x      = e.clientX - rect.left;
      const y      = e.clientY - rect.top;
      const cx     = rect.width  / 2;
      const cy     = rect.height / 2;
      const rotateX = ((y - cy) / cy) * -5;   // max ±5°
      const rotateY = ((x - cx) / cx) *  5;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
      card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
    });

    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.08s ease, box-shadow 0.3s ease';
    });
  });

  /* ─── 5. Cursor spotlight in hero sections ───────────── */
  document.querySelectorAll('.hero-bg').forEach((hero) => {
    let spotlight = hero.querySelector('.hero-spotlight');
    if (!spotlight) {
      spotlight = document.createElement('div');
      spotlight.className = 'hero-spotlight';
      hero.appendChild(spotlight);
    }

    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      spotlight.style.left = (e.clientX - rect.left) + 'px';
      spotlight.style.top  = (e.clientY - rect.top)  + 'px';
    });
  });

  /* ─── 6. Particle dots in hero ───────────────────────── */
  const particleContainer = document.getElementById('particleContainer');
  if (particleContainer) {
    for (let i = 0; i < 18; i++) {
      const dot  = document.createElement('div');
      dot.className = 'particle-dot';
      const size = Math.random() * 6 + 3;
      dot.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation-duration:${Math.random() * 10 + 8}s;
        animation-delay:${Math.random() * 6}s;
        opacity:${0.15 + Math.random() * 0.5};
      `;
      particleContainer.appendChild(dot);
    }
  }

  /* ─── 7. Smart navbar transparency ──────────────────── */
  const nav        = document.getElementById('mainNav');
  const heroSect   = document.querySelector('section.hero-bg, div.hero-bg');

  if (nav && heroSect) {
    const handleScroll = () => {
      const heroBottom = heroSect.offsetTop + heroSect.offsetHeight;
      const scrolled   = window.scrollY > heroBottom - 80;

      nav.classList.toggle('bg-white/95', scrolled);
      nav.classList.toggle('shadow-md',   scrolled);
      nav.classList.toggle('bg-transparent', !scrolled);

      nav.querySelectorAll('a:not(.btn-glow):not(.btn-shimmer)').forEach((a) => {
        a.classList.add('text-gray-900');
        a.classList.remove('text-blue-100', 'text-white');
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // run once on load

    // Smooth scroll for hero indicator
    const scrollDownBtn = document.getElementById('scrollDownBtn');
    if (scrollDownBtn) {
      scrollDownBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector('#services');
        if (target) {
          window.scrollTo({
            top: target.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      });
    }
  }

  /* ─── 8. Mobile menu toggle ──────────────────────────── */
  const menuBtn    = document.getElementById('mobileMenuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    mobileMenu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => mobileMenu.classList.add('hidden'))
    );
  }

})();
