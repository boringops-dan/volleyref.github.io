// VolleyRef.App A/B Testing Framework
// Lightweight, localStorage-persisted, GA4-integrated

(function() {
  'use strict';

  var defined = {};

  var AB = {
    tests: {},

    init: function() {
      this.defineTest('hero_headline', ['A', 'B']);
      this.defineTest('cta_text', ['A', 'B']);
      this.applyAll();
      this.syncToGA4();
    },

    defineTest: function(name, variants) {
      defined[name] = variants;
      this.tests[name] = this.getVariant(name, variants);
    },

    getVariant: function(name, variants) {
      // 1. URL param override (?ab_hero_headline=B)
      var params = new URLSearchParams(window.location.search);
      var override = params.get('ab_' + name);
      if (override && variants.indexOf(override) !== -1) {
        return override;
      }

      // 2. localStorage persistence
      var stored = localStorage.getItem('ab_' + name);
      if (stored && variants.indexOf(stored) !== -1) {
        return stored;
      }

      // 3. Random assignment
      var variant = variants[Math.floor(Math.random() * variants.length)];
      try {
        localStorage.setItem('ab_' + name, variant);
      } catch (e) {
        // localStorage unavailable
      }
      return variant;
    },

    applyAll: function() {
      var elements = document.querySelectorAll('[data-ab-test]');
      for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var testName = el.getAttribute('data-ab-test');
        var elVariant = el.getAttribute('data-ab-variant');
        var activeVariant = this.tests[testName];

        if (activeVariant && elVariant) {
          if (elVariant === activeVariant) {
            el.classList.add('ab-active');
          } else {
            el.classList.remove('ab-active');
          }
        }
      }
    },

    syncToGA4: function() {
      if (typeof gtag === 'function') {
        var props = {};
        for (var name in this.tests) {
          props['ab_' + name] = this.tests[name];
        }
        gtag('set', 'user_properties', props);
      }
    },

    getVariantFor: function(name) {
      return this.tests[name] || 'A';
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { AB.init(); });
  } else {
    AB.init();
  }

  window.ABTest = AB;
})();
