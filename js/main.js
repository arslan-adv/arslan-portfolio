/* Muhammad Arslan Tofique — portfolio interactions.
   Zero dependencies. Every behavior degrades gracefully if disabled. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------- Scroll reveal (init first for resilience) ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if ('IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  var header = document.getElementById('site-header');
  var navToggle = document.getElementById('nav-toggle');
  var nav = document.getElementById('site-nav');

  /* ---------- Sticky header shadow ---------- */
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  };
  if ('requestAnimationFrame' in window) {
    var ticking = false;
    var update = function () {
      ticking = false;
      onScroll();
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  onScroll();

  /* ---------- Mobile navigation ---------- */
  var setNavOpen = function (open) {
    if (!nav || !navToggle) return;
    nav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setNavOpen(false);
        navToggle.focus();
      }
    });

    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('is-open')) return;
      if (nav.contains(e.target) || navToggle.contains(e.target)) return;
      setNavOpen(false);
    });

    var navLinks = nav.querySelectorAll('a');
    Array.prototype.forEach.call(navLinks, function (link) {
      link.addEventListener('click', function () {
        setNavOpen(false);
      });
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1024) setNavOpen(false);
    });
  }

  /* ---------- Active nav link ---------- */
  var navItems = Array.prototype.slice.call(document.querySelectorAll('.nav-link'));
  var sections = navItems
    .map(function (link) {
      var id = link.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return null;
      return document.querySelector(id);
    })
    .filter(Boolean);

  var setActive = function (id) {
    navItems.forEach(function (link) {
      var isActive = link.getAttribute('href') === '#' + id;
      link.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  };

  if ('IntersectionObserver' in window && sections.length) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });
    sections.forEach(function (section) { navObserver.observe(section); });
  } else if (sections.length) {
    var scrollSpy = function () {
      var pos = window.scrollY + headerHeight() + 60;
      var current = sections[0].id;
      sections.forEach(function (section) {
        if (section.offsetTop <= pos) current = section.id;
      });
      setActive(current);
    };
    window.addEventListener('scroll', scrollSpy, { passive: true });
    scrollSpy();
  }

  function headerHeight() {
    return header ? header.offsetHeight : 0;
  }
})();