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

  // Navbar fit check: switch to the compact (hamburger) layout whenever the
  // logo, links and CTAs don't actually fit in one row, rather than relying
  // on a single fixed viewport breakpoint that can leave in-between widths
  // squeezing the row into overlapping text.
  var navContainer = navbar ? navbar.querySelector('.container') : null;
  if (navbar && navContainer) {
    var checkNavFit = function() {
      var wasCompact = navbar.classList.contains('nav-compact');
      navbar.classList.remove('nav-compact');
      navbar.classList.add('nav-measuring');
      var overflows = navContainer.scrollWidth > navContainer.clientWidth;
      navbar.classList.remove('nav-measuring');
      if (overflows) {
        navbar.classList.add('nav-compact');
      } else if (wasCompact && navLinks) {
        navLinks.classList.remove('active');
        if (mobileToggle) {
          mobileToggle.textContent = '☰';
          mobileToggle.setAttribute('aria-expanded', 'false');
        }
      }
    };

    checkNavFit();

    var navFitRaf = null;
    var scheduleNavFitCheck = function() {
      if (navFitRaf) {
        window.cancelAnimationFrame(navFitRaf);
      }
      navFitRaf = window.requestAnimationFrame(checkNavFit);
    };

    window.addEventListener('resize', scheduleNavFitCheck);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleNavFitCheck);
    }
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

  // Shared open sequence for both lightbox flavors: save focus, pause the
  // background demos, mount the content, lock scroll, focus the close button.
  function openLightboxWith(contentEl, video) {
    lastFocusEl = document.activeElement;
    demoVideos.forEach(function(v) { try { v.pause(); } catch (e) {} });
    lightboxInner.innerHTML = '';
    lightboxInner.appendChild(contentEl);
    lightboxVideo = video || null;
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (lightboxClose) lightboxClose.focus();
  }

  function openLightbox(fromVideo) {
    if (!fromVideo) return;

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

    openLightboxWith(v, v);

    // play best-effort
    var p = v.play();
    if (p && typeof p.catch === 'function') p.catch(function(){});
  }

  function openImageLightbox(src, alt) {
    if (!src) return;
    var img = document.createElement('img');
    img.src = src;
    img.alt = alt || '';
    img.className = 'video-lightbox-image';
    openLightboxWith(img);
  }

  var sheetButton = document.querySelector('.vh-sheet');
  if (sheetButton) {
    sheetButton.addEventListener('click', function() {
      var img = sheetButton.querySelector('img');
      if (img) openImageLightbox(img.currentSrc || img.src, img.alt);
    });
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
      var card = v.closest('.feature-card, .vh-feature-card, .vh-step');
      if (card) {
        card.addEventListener('mouseenter', function() {
          // simple override: play this one on hover
          if (v.paused) playVideo(v);
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

  // The hero footage has inline sources so it skips the lazy-demo machinery,
  // which made it the one looping video never paused off-screen. Pause it too.
  var heroVideo = document.querySelector('.vh-hero-demo video');
  if (heroVideo) {
    new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var p = heroVideo.play();
          if (p && typeof p.catch === 'function') p.catch(function(){});
        } else {
          heroVideo.pause();
        }
      });
    }, { threshold: 0.2 }).observe(heroVideo);
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

  // Live-story stage: devices join one match beat by beat; the final beat
  // takes the cloud offline and the mesh holds. Auto-advances in view,
  // rail buttons jump to a beat, reduced motion shows the finale statically.
  var storyStage = document.querySelector('.vh-story-stage');
  if (storyStage) {
    var FINAL_STEP = 8;
    var storyItems = storyStage.querySelectorAll('[data-on]');
    var stepButtons = document.querySelectorAll('[data-step-btn]');
    var storySvg = storyStage.querySelector('.vh-story-links');
    var storyTimer = null;
    var resumeTimer = null;
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var watchersEl = storyStage.querySelector('[data-watchers]');
    var WATCHERS_BY_STEP = { 4: 12, 5: 15, 6: 19, 7: 24, 8: 27 };
    var captionEl = storyStage.querySelector('.vh-story-caption');
    var captionTimeEl = storyStage.querySelector('[data-caption-time]');
    var captionTextEl = storyStage.querySelector('[data-caption-text]');
    var tvScoreEl = storyStage.querySelector('[data-tvscore]');
    // One league night, told beat by beat. The clock moves, the score climbs,
    // and the set gets won after the internet is already gone.
    var CAPTIONS = [
      { t: '7:02 PM', x: 'League night. You tap the first point of the semifinal.' },
      { t: '7:03 PM', x: 'Every tap is saved to the cloud before the ball hits the floor.' },
      { t: '7:15 PM', x: 'Someone casts the gym TV. The bench stops asking you the score.' },
      { t: '7:31 PM', x: 'Mom in row 4 and grandma three states away see point 19 land at the same second.' },
      { t: '7:58 PM', x: 'R2 joins on a second tablet. Same match, two whistles, zero conflicts.' },
      { t: '8:12 PM', x: 'You fix the net antenna and score two rallies from your wrist.' },
      { t: '8:40 PM', x: 'A parent\'s Android and the scorer\'s laptop lock onto the same heartbeat.' },
      { t: '9:14 PM', x: 'The internet goes down mid-rally. Nobody in the gym notices. The set finishes anyway.' }
    ];
    var TV_SCORES = { 3: '16 - 13', 4: '19 - 16', 5: '21 - 18', 6: '23 - 20', 7: '24 - 22', 8: '25 - 23 SET' };

    function setStoryStep(n, beatMs) {
      storyStage.dataset.step = String(n);
      storyStage.classList.toggle('is-offline', n >= FINAL_STEP);
      storyItems.forEach(function(el) {
        el.classList.toggle('is-on', n >= parseInt(el.dataset.on, 10));
      });
      stepButtons.forEach(function(btn) {
        var active = parseInt(btn.dataset.stepBtn, 10) === n;
        btn.classList.toggle('is-active', active);
        if (active && beatMs) btn.style.setProperty('--beat', beatMs + 'ms');
      });
      // Both chips are display:none until their node's step, so only their
      // mapped steps need writes; the HTML text is the single seed value.
      if (watchersEl && WATCHERS_BY_STEP[n]) {
        watchersEl.textContent = '+' + WATCHERS_BY_STEP[n] + ' watching';
      }
      if (tvScoreEl && TV_SCORES[n]) {
        tvScoreEl.textContent = TV_SCORES[n];
      }
      var cap = CAPTIONS[n - 1];
      if (captionEl && cap) {
        captionTimeEl.textContent = cap.t;
        captionTextEl.textContent = cap.x;
        captionEl.classList.remove('is-swap');
        void captionEl.offsetWidth;
        captionEl.classList.add('is-swap');
      }
    }

    // Each beat lasts long enough to actually read its caption: ~3 words per
    // second (a standard comfortable reading rate) plus settle time, and the
    // finale holds a little longer.
    function beatDuration(step) {
      var cap = CAPTIONS[step - 1];
      var words = cap ? cap.x.split(/\s+/).length : 10;
      var ms = Math.max(5000, Math.round((words / 3) * 1000) + 2500);
      if (step === FINAL_STEP) ms += 3000;
      return ms;
    }

    function advanceStory() {
      var current = parseInt(storyStage.dataset.step, 10) || 1;
      var next = current >= FINAL_STEP ? 1 : current + 1;
      var beat = beatDuration(next);
      setStoryStep(next, beat);
      storyTimer = setTimeout(advanceStory, beat);
    }

    function pauseStory(resumeAfterMs) {
      clearTimeout(storyTimer);
      clearTimeout(resumeTimer);
      if (resumeAfterMs && !prefersReduced) {
        resumeTimer = setTimeout(function() {
          storyTimer = setTimeout(advanceStory, 800);
        }, resumeAfterMs);
      }
    }

    stepButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        setStoryStep(parseInt(btn.dataset.stepBtn, 10), 9800);
        pauseStory(9000);
      });
    });

    // The pulse dots are SMIL animations that otherwise tick for the whole
    // page lifetime; freeze the SVG clock whenever the stage can't be seen.
    function setSvgRunning(running) {
      if (!storySvg || !storySvg.pauseAnimations) return;
      try {
        if (running) { storySvg.unpauseAnimations(); } else { storySvg.pauseAnimations(); }
      } catch (e) {}
    }

    if (prefersReduced) {
      setStoryStep(FINAL_STEP);
      setSvgRunning(false);
    } else {
      setStoryStep(1);
      var storyObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          setSvgRunning(entry.isIntersecting);
          if (entry.isIntersecting) {
            clearTimeout(storyTimer);
            storyTimer = setTimeout(advanceStory, beatDuration(1));
          } else {
            pauseStory();
          }
        });
      }, { threshold: 0.35 });
      storyObserver.observe(storyStage);
    }
  }
});
