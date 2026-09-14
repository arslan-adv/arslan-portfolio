/* Visitor tracking — collects privacy-conscious session telemetry and sends
   ONE EmailJS summary email per session. Never per scroll / click / heartbeat. */
(function () {
  'use strict';

  var config = window.PORTFOLIO_CONFIG || {};

  var SESSION_KEY = 'portfolio_session_id';
  var VISITOR_KEY = 'portfolio_visitor_id';
  var VISITED_KEY = 'portfolio_visited';

  var SECTION_LABELS = {
    top: 'Home',
    about: 'About',
    experience: 'Experience',
    education: 'Education',
    skills: 'Skills',
    projects: 'Projects',
    certification: 'Certification',
    'career-focus': 'Career Focus',
    contact: 'Contact'
  };

  var SAFETY_SEND_MS = 25 * 60 * 1000;

  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
  }

  function getSessionId() {
    var id = null;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch (e) {}
    if (!id) {
      id = generateId('session');
      try { sessionStorage.setItem(SESSION_KEY, id); } catch (e) {}
    }
    return id;
  }

  function getVisitorId() {
    var id = null;
    try { id = localStorage.getItem(VISITOR_KEY); } catch (e) {}
    if (!id) {
      id = generateId('visitor');
      try { localStorage.setItem(VISITOR_KEY, id); } catch (e) {}
    }
    return id;
  }

  function getDeviceType() {
    var width = window.innerWidth;
    if (width < 768) return 'Mobile';
    if (width < 1024) return 'Tablet';
    return 'Desktop';
  }

  function getBrowser() {
    var ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return 'Microsoft Edge';
    if (/OPR\//.test(ua)) return 'Opera';
    if (/Chrome\//.test(ua)) return 'Google Chrome';
    if (/Firefox\//.test(ua)) return 'Mozilla Firefox';
    if (/Safari\//.test(ua)) return 'Safari';
    return 'Unknown';
  }

  function getOS() {
    var ua = navigator.userAgent;
    if (/Windows/.test(ua)) return 'Windows';
    if (/Mac OS X|Macintosh/.test(ua)) return 'macOS';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Linux/.test(ua)) return 'Linux';
    return 'Unknown';
  }

  function sanitizeUrl(url) {
    if (!url) return url;
    return String(url).split('?')[0].split('#')[0].slice(0, 500);
  }

  function getUTM(name) {
    try {
      var value = new URLSearchParams(window.location.search).get(name);
      return value ? String(value).slice(0, 120) : 'Not available';
    } catch (e) {
      return 'Not available';
    }
  }

  function formatDuration(ms) {
    var total = Math.max(0, Math.floor(ms / 1000));
    if (total === 0) total = 1;
    return Math.floor(total / 60) + 'm ' + (total % 60) + 's';
  }

  function getScrollDepth() {
    var resolve = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    if (resolve <= 0) return 100;
    return Math.min(100, Math.round((window.scrollY / resolve) * 100));
  }

  function ensureEmailJS() {
    if (!window.emailjs) return false;
    if (!emailjs.__portfolioInited) {
      try {
        emailjs.init(config.publicKey);
        emailjs.__portfolioInited = true;
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  ensureEmailJS();

  function startTracking() {
    var enabled = config.enableVisitorEmail === true;

    var sessionId = getSessionId();
    var visitorId = getVisitorId();

    var startTime = Date.now();
    var isReturning = false;
    try { isReturning = localStorage.getItem(VISITED_KEY) === 'true'; } catch (e) {}
    try { localStorage.setItem(VISITED_KEY, 'true'); } catch (e) {}

    var landing = window.location.href;
    var timezone;
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
    } catch (e) {
      timezone = 'Unknown';
    }
    var referrer = document.referrer ? sanitizeUrl(document.referrer) : 'Direct Visit';

    var sectionsViewed = [];
    var seen = {};
    var maxScroll = 0;
    var scrollTicking = false;
    var sent = false;
    var observer = null;
    var safetyTimer = null;

    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (
            entry.isIntersecting &&
            entry.intersectionRatio >= 0.2 &&
            !seen[entry.target.id]
          ) {
            seen[entry.target.id] = true;
            sectionsViewed.push(SECTION_LABELS[entry.target.id] || entry.target.id);
          }
        });
      }, { threshold: [0.2] });

      var sections = document.querySelectorAll('section[id]');
      Array.prototype.forEach.call(sections, function (section) {
        observer.observe(section);
      });
    }

    var updateScroll = function () {
      scrollTicking = false;
      var depth = getScrollDepth();
      if (depth > maxScroll) maxScroll = depth;
    };

    var onScroll = function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(updateScroll);
        scrollTicking = true;
      }
    };

    var onHide = function () { sendReport(); };
    var onVisibility = function () {
      if (document.visibilityState === 'hidden') sendReport();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', onHide);
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onVisibility);

    function teardown() {
      if (observer) { observer.disconnect(); observer = null; }
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    }

    function buildParams() {
      return {
        session_id: sessionId,
        visitor_id: visitorId,
        visit_time: new Date().toLocaleString(),
        session_type: isReturning ? 'Returning Visitor' : 'First Visit',
        duration: formatDuration(Date.now() - startTime),
        scroll_depth: maxScroll + '%',
        sections_viewed:
          sectionsViewed.length > 0 ? sectionsViewed.join(', ') : 'Home',
        device_type: getDeviceType(),
        operating_system: getOS(),
        browser: getBrowser(),
        screen_size: (window.screen.width || 0) + ' \u00D7 ' + (window.screen.height || 0),
        screen_dpr: String(window.devicePixelRatio || 1),
        language: navigator.language || 'Unknown',
        visitor_timezone: timezone,
        referrer: referrer,
        landing_page: sanitizeUrl(landing) || 'Not available',
        current_page: sanitizeUrl(window.location.href) || 'Not available',
        utm_source: getUTM('utm_source'),
        utm_medium: getUTM('utm_medium'),
        utm_campaign: getUTM('utm_campaign'),
        utm_term: getUTM('utm_term'),
        utm_content: getUTM('utm_content'),
        is_first_visit: isReturning ? 'No' : 'Yes',
        is_returning: isReturning ? 'Yes' : 'No',
        visitor_country: 'Not available',
        visitor_region: 'Not available',
        visitor_city: 'Not available',
        visitor_ip: 'Not available',
        portfolio_url: window.location.origin
      };
    }

    function sendReport() {
      if (sent) return;
      sent = true;
      teardown();

      var params = buildParams();

      if (!enabled) {
        if (window.console && console.log) {
          console.log('[Visitor Tracking - Development]', params);
        }
        return;
      }

      if (!ensureEmailJS()) {
        if (window.console && console.warn) {
          console.warn('[Visitor Tracking] EmailJS unavailable; report skipped.');
        }
        return;
      }

      emailjs.send(config.serviceId, config.visitorTemplateId, params).then(
        function () {
          if (window.console && console.log) {
            console.log('[Visitor Tracking] Report sent.');
          }
        },
        function () {
          if (window.console && console.warn) {
            console.warn('[Visitor Tracking] Report delivery failed.');
          }
        }
      );
    }

    safetyTimer = setTimeout(sendReport, SAFETY_SEND_MS);

    var isTest = false;
    try {
      isTest = new URLSearchParams(window.location.search).get('emailjs_test') === 'true';
    } catch (e) {}
    if (isTest) {
      setTimeout(sendReport, 800);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTracking);
  } else {
    startTracking();
  }
})();