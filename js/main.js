// VolleyRef.App Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Navigation Toggle
  var mobileToggle = document.querySelector('.mobile-toggle');
  var navLinks = document.querySelector('.nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      var isOpen = navLinks.classList.contains('active');
      this.textContent = isOpen ? '\u2715' : '\u2630';
      this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile nav when clicking an anchor link
    navLinks.querySelectorAll('a[href^="#"]').forEach(function(link) {
      link.addEventListener('click', function() {
        navLinks.classList.remove('active');
        mobileToggle.textContent = '\u2630';
      });
    });
  }

  // Navbar scroll effect
  var navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', function() {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }

  // FAQ Accordion
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function(item) {
    var question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', function() {
        faqItems.forEach(function(other) {
          if (other !== item) {
            other.classList.remove('active');
            var otherBtn = other.querySelector('.faq-question');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });
        item.classList.toggle('active');
        question.setAttribute('aria-expanded', item.classList.contains('active') ? 'true' : 'false');
      });
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId !== '#') {
        e.preventDefault();
        var target = document.querySelector(targetId);
        if (target) {
          var navHeight = navbar ? navbar.offsetHeight : 0;
          var targetPos = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
          window.scrollTo({
            top: targetPos,
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Animate elements on scroll
  var observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card, .step, .benefit-card, .problem-card, .price-card-bold').forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
  });

  var style = document.createElement('style');
  style.textContent = '.animate-in { opacity: 1 !important; transform: translateY(0) !important; }';
  document.head.appendChild(style);

  // Feature card mini demos: lazy-load + autoplay in view
  // - videos are muted + loop
  // - load sources only when in view
  // - hovering a card plays that card immediately
  // - tapping/clicking a demo opens a lightbox player
  var demoVideos = Array.prototype.slice.call(document.querySelectorAll('.feature-demo-video'));

  // Video lightbox (created dynamically so it works on every page)
  var lightbox = document.createElement('div');
  lightbox.className = 'video-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Video preview');
  lightbox.innerHTML = ''
    + '<button class="btn btn-outline btn-small video-lightbox-close" type="button" aria-label="Close">Close</button>'
    + '<div class="video-lightbox-inner"></div>';
  document.body.appendChild(lightbox);

  var lightboxInner = lightbox.querySelector('.video-lightbox-inner');
  var lightboxClose = lightbox.querySelector('.video-lightbox-close');
  var lightboxVideo = null;
  var lastFocusEl = null;

  function openLightbox(fromVideo) {
    if (!fromVideo) return;

    lastFocusEl = document.activeElement;

    // pause background demos so audio/state doesn't fight
    demoVideos.forEach(function(v) { try { v.pause(); } catch (e) {} });

    // clear previous
    lightboxInner.innerHTML = '';

    var v = document.createElement('video');
    v.controls = true;
    v.playsInline = true;
    v.loop = true;

    // Start muted so autoplay is allowed; user can unmute in controls.
    v.muted = true;

    var mp4 = fromVideo.getAttribute('data-mp4');
    var webm = fromVideo.getAttribute('data-webm');
    var poster = fromVideo.getAttribute('poster');
    if (poster) v.setAttribute('poster', poster);

    // Prefer MP4 first.
    if (mp4) {
      var sMp4 = document.createElement('source');
      sMp4.src = mp4;
      sMp4.type = 'video/mp4';
      v.appendChild(sMp4);
    }

    // Only add WebM if the browser claims it can play it.
    var canPlayWebm = false;
    try { canPlayWebm = !!(v.canPlayType && v.canPlayType('video/webm; codecs="vp9"')); } catch (e) { canPlayWebm = false; }
    if (webm && canPlayWebm) {
      var sWebm = document.createElement('source');
      sWebm.src = webm;
      sWebm.type = 'video/webm';
      v.appendChild(sWebm);
    }

    lightboxInner.appendChild(v);
    lightboxVideo = v;

    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    // play best-effort
    var p = v.play();
    if (p && typeof p.catch === 'function') p.catch(function(){});

    // move focus to close button
    if (lightboxClose) lightboxClose.focus();
  }

  function closeLightbox() {
    if (!lightbox.classList.contains('is-open')) return;

    try { if (lightboxVideo) lightboxVideo.pause(); } catch (e) {}
    lightboxVideo = null;

    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';

    // resume in-view demos will be handled by observer; do nothing here.

    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      lastFocusEl.focus();
    }
    lastFocusEl = null;
  }

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  lightbox.addEventListener('click', function(e) {
    if (e.target === lightbox) closeLightbox();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeLightbox();
  });

  function ensureSources(video) {
    if (!video || video.dataset.loaded === 'true') return;

    var webm = video.getAttribute('data-webm');
    var mp4 = video.getAttribute('data-mp4');

    // Safari often won't play VP9/WebM. Prefer MP4 first, and only add WebM when supported.
    var canPlayWebm = false;
    try {
      canPlayWebm = !!(video.canPlayType && video.canPlayType('video/webm; codecs="vp9"'));
    } catch (e) { canPlayWebm = false; }

    if (mp4) {
      var sMp4 = document.createElement('source');
      sMp4.src = mp4;
      sMp4.type = 'video/mp4';
      video.appendChild(sMp4);
    }

    if (webm && canPlayWebm) {
      var sWebm = document.createElement('source');
      sWebm.src = webm;
      sWebm.type = 'video/webm';
      video.appendChild(sWebm);
    }

    video.load();
    video.dataset.loaded = 'true';
  }

  function playVideo(video) {
    if (!video) return;
    ensureSources(video);
    var p = video.play();
    if (p && typeof p.catch === 'function') p.catch(function(){});
  }

  function pauseVideo(video) {
    if (!video) return;
    video.pause();
  }

  if (demoVideos.length) {
    var demoObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var v = entry.target;
        if (entry.isIntersecting) {
          playVideo(v);
        } else {
          pauseVideo(v);
        }
      });
    }, { threshold: 0.35 });

    demoVideos.forEach(function(v) {
      demoObserver.observe(v);

      // Hover plays the video
      var card = v.closest('.feature-card');
      if (card) {
        card.addEventListener('mouseenter', function() {
          // simple override: play this one on hover
          playVideo(v);
        });
      }

      // Click/tap opens lightbox
      v.addEventListener('click', function(e) {
        // On mobile this is typically a tap; stop default iOS fullscreen handling.
        e.preventDefault();
        e.stopPropagation();
        openLightbox(v);
      });
    });
  }

  // Scroll-based active nav link highlighting
  var sections = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  if (sections.length && navAnchors.length) {
    var sectionObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var id = entry.target.getAttribute('id');
          navAnchors.forEach(function(a) {
            if (a.getAttribute('href') === '#' + id) {
              a.classList.add('section-active');
            } else {
              a.classList.remove('section-active');
            }
          });
        }
      });
    }, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    });

    sections.forEach(function(section) {
      sectionObserver.observe(section);
    });
  }
});
