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
