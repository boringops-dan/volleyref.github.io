// VolleyRef.App GA4 Analytics
// Comprehensive event tracking with page context

(function() {
  'use strict';

  // ── Helpers ──────────────────────────────────────────────

  function log(event, params) {
    var enriched = Object.assign({}, getPageContext(), params);
    console.log('[Analytics]', event, enriched);
    if (typeof gtag === 'function') {
      gtag('event', event, enriched);
    }
  }

  function getPageContext() {
    var path = window.location.pathname.replace(/\.html$/, '').replace(/^\//, '') || 'index';
    var type = 'landing';
    if (path === 'index') type = 'homepage';
    else if (path.indexOf('scoring-for-') !== -1) type = 'audience';
    else type = 'feature';
    return {
      page_name: path,
      page_type: type
    };
  }

  // ── CTA Click Tracking ──────────────────────────────────

  function initCTATracking() {
    document.addEventListener('click', function(e) {
      var el = e.target.closest('[data-cta]');
      if (!el) return;

      var href = (el.tagName === 'A') ? (el.getAttribute('href') || '') : '';
      var destination_type = 'internal';
      if (href.indexOf('app.volleyref.app') !== -1) destination_type = 'app';
      else if (href && href.indexOf('http') === 0) destination_type = 'external';

      log('cta_click', {
        cta_location: el.getAttribute('data-cta'),
        cta_text: (el.textContent || '').trim(),
        plan_type: el.getAttribute('data-plan') || '',
        cta_href: href,
        destination_type: destination_type
      });
    });
  }

  // ── Outbound / Conversion Tracking ──────────────────────

  function initOutboundTracking() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (!link) return;

      var href = link.getAttribute('href') || '';
      if (href.indexOf('app.volleyref.app') === -1) return;

      // Normalize destinations for marketing-site conversion measurement.
      var destination_path = '';
      try {
        destination_path = new URL(href, window.location.href).pathname || '';
      } catch (_) {
        destination_path = href;
      }

      var destination_type = 'start_scoring';
      if (destination_path.indexOf('/login') !== -1) destination_type = 'login';
      else if (destination_path.indexOf('/pricing') !== -1) destination_type = 'pricing';

      var cta_location = link.getAttribute('data-cta') || (link.closest('[data-cta]') && link.closest('[data-cta]').getAttribute('data-cta')) || 'unknown';

      // One clean conversion event per click.
      if (destination_type === 'login') {
        log('login_click', {
          link_url: href,
          destination_path: destination_path,
          cta_location: cta_location
        });
      } else if (destination_type === 'pricing') {
        log('pricing_click', {
          link_url: href,
          destination_path: destination_path,
          cta_location: cta_location
        });
      } else {
        log('start_scoring_click', {
          link_url: href,
          destination_path: destination_path,
          cta_location: cta_location
        });
      }

      // Also keep a generic outbound event for diagnostics.
      log('outbound_app_click', {
        link_url: href,
        destination_path: destination_path,
        destination_type: destination_type,
        link_text: (link.textContent || '').trim(),
        cta_location: cta_location
      });
    });
  }

  // ── Internal Link Tracking ──────────────────────────────

  function initInternalLinkTracking() {
    document.addEventListener('click', function(e) {
      // Footer links
      var footerLink = e.target.closest('.footer a');
      if (footerLink) {
        log('internal_link_click', {
          link_section: 'footer',
          link_text: footerLink.textContent.trim(),
          link_url: footerLink.getAttribute('href')
        });
        return;
      }

      // Related features / feature card links
      var featureLink = e.target.closest('.feature-card[href], .feature-card a, .feature-card-link');
      if (featureLink) {
        var card = featureLink.closest('.feature-card') || featureLink;
        var heading = card.querySelector('h3');
        log('related_feature_click', {
          link_text: heading ? heading.textContent.trim() : featureLink.textContent.trim(),
          link_url: featureLink.getAttribute('href') || (card.getAttribute && card.getAttribute('href')) || ''
        });
        return;
      }

      // Breadcrumb links
      var breadcrumbLink = e.target.closest('.breadcrumb a');
      if (breadcrumbLink) {
        log('breadcrumb_click', {
          link_text: breadcrumbLink.textContent.trim(),
          link_url: breadcrumbLink.getAttribute('href')
        });
        return;
      }

      // Pricing anchor links
      var pricingLink = e.target.closest('a[href*="pricing"]');
      if (pricingLink) {
        log('pricing_link_click', {
          link_text: pricingLink.textContent.trim(),
          link_url: pricingLink.getAttribute('href')
        });
      }
    });
  }

  // ── Navigation Tracking ─────────────────────────────────

  function initNavTracking() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('.nav-links a, .nav-cta a');
      if (!link) return;
      log('nav_click', {
        nav_item: link.textContent.trim()
      });
    });
  }

  // ── Section Visibility Tracking ─────────────────────────

  function initSectionTracking() {
    var sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;

    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          log('section_view', {
            section_name: entry.target.getAttribute('data-section')
          });
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    sections.forEach(function(section) {
      observer.observe(section);
    });
  }

  // ── Scroll Depth Tracking ───────────────────────────────

  function initScrollDepthTracking() {
    var thresholds = [25, 50, 75, 100];
    var fired = {};

    function getScrollPercent() {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return 100;
      return Math.round((window.scrollY / docHeight) * 100);
    }

    var debounceTimer = null;
    window.addEventListener('scroll', function() {
      if (debounceTimer) return;
      debounceTimer = setTimeout(function() {
        debounceTimer = null;
        var pct = getScrollPercent();
        for (var i = 0; i < thresholds.length; i++) {
          var t = thresholds[i];
          if (pct >= t && !fired[t]) {
            fired[t] = true;
            log('scroll_depth', {
              depth_percent: t
            });
          }
        }
      }, 200);
    }, { passive: true });
  }

  // ── FAQ Tracking ────────────────────────────────────────

  function initFAQTracking() {
    document.addEventListener('click', function(e) {
      var question = e.target.closest('.faq-question');
      if (!question) return;
      var item = question.closest('.faq-item');
      if (item && !item.classList.contains('active')) {
        log('faq_expand', {
          question_text: question.textContent.trim()
        });
      }
    });
  }

  // ── Pricing Tracking ────────────────────────────────────

  function initPricingTracking() {
    // Hover tracking (1s threshold)
    var cards = document.querySelectorAll('[data-plan]');
    cards.forEach(function(card) {
      var timer = null;
      card.addEventListener('mouseenter', function() {
        timer = setTimeout(function() {
          log('pricing_card_hover', {
            plan_type: card.getAttribute('data-plan')
          });
        }, 1000);
      });
      card.addEventListener('mouseleave', function() {
        if (timer) clearTimeout(timer);
      });
    });

    // Click tracking on pricing CTAs
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-plan] a, [data-plan] button');
      if (!btn) return;
      var card = btn.closest('[data-plan]');
      log('pricing_card_click', {
        plan_type: card ? card.getAttribute('data-plan') : 'unknown',
        cta_text: btn.textContent.trim()
      });
    });
  }

  // ── Core Web Vitals ─────────────────────────────────────

  function initCoreWebVitals() {
    if (!('PerformanceObserver' in window)) return;

    // LCP (Largest Contentful Paint)
    try {
      new PerformanceObserver(function(list) {
        var entries = list.getEntries();
        var last = entries[entries.length - 1];
        log('web_vital', {
          metric_name: 'LCP',
          metric_value: Math.round(last.startTime),
          metric_rating: last.startTime < 2500 ? 'good' : last.startTime < 4000 ? 'needs-improvement' : 'poor'
        });
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {}

    // CLS (Cumulative Layout Shift)
    try {
      var clsValue = 0;
      new PerformanceObserver(function(list) {
        list.getEntries().forEach(function(entry) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
      }).observe({ type: 'layout-shift', buffered: true });

      // Report CLS on page hide
      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden') {
          log('web_vital', {
            metric_name: 'CLS',
            metric_value: Math.round(clsValue * 1000) / 1000,
            metric_rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor'
          });
        }
      });
    } catch (e) {}

    // INP (Interaction to Next Paint)
    try {
      var inpValue = 0;
      new PerformanceObserver(function(list) {
        list.getEntries().forEach(function(entry) {
          if (entry.duration > inpValue) {
            inpValue = entry.duration;
          }
        });
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 });

      document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'hidden' && inpValue > 0) {
          log('web_vital', {
            metric_name: 'INP',
            metric_value: Math.round(inpValue),
            metric_rating: inpValue < 200 ? 'good' : inpValue < 500 ? 'needs-improvement' : 'poor'
          });
        }
      });
    } catch (e) {}

    // TTFB (Time to First Byte)
    try {
      var navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        var ttfb = Math.round(navEntry.responseStart);
        log('web_vital', {
          metric_name: 'TTFB',
          metric_value: ttfb,
          metric_rating: ttfb < 800 ? 'good' : ttfb < 1800 ? 'needs-improvement' : 'poor'
        });
      }
    } catch (e) {}
  }

  // ── Engagement Timer ────────────────────────────────────

  function initEngagementTracking() {
    var engaged = false;
    var startTime = Date.now();

    // Fire at 30s of active engagement
    var timer = setTimeout(function() {
      engaged = true;
      log('engaged_session', {
        engagement_seconds: 30
      });
    }, 30000);

    // Report time on page when leaving
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'hidden') {
        var seconds = Math.round((Date.now() - startTime) / 1000);
        log('page_engagement', {
          time_on_page_seconds: seconds,
          deeply_engaged: engaged
        });
        clearTimeout(timer);
      }
    });
  }

  // ── Init ────────────────────────────────────────────────

  function init() {
    initCTATracking();
    initOutboundTracking();
    initInternalLinkTracking();
    initNavTracking();
    initSectionTracking();
    initScrollDepthTracking();
    initFAQTracking();
    initPricingTracking();
    initCoreWebVitals();
    initEngagementTracking();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
