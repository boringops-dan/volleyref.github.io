// VolleyRef.io Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Mobile Navigation Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', function() {
      navLinks.classList.toggle('active');
      this.textContent = navLinks.classList.contains('active') ? '✕' : '☰';
    });
  }

  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
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
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', function() {
        // Close other items
        faqItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('active');
          }
        });
        // Toggle current item
        item.classList.toggle('active');
      });
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId !== '#') {
        e.preventDefault();
        const target = document.querySelector(targetId);
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
    });
  });

  // Animate elements on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.feature-card, .pricing-card, .testimonial-card, .step, .benefit-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
  });

  // Add animate-in styles
  const style = document.createElement('style');
  style.textContent = `
    .animate-in {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);

  // Form submission handling
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      // Show success message
      const btn = this.querySelector('.btn');
      const originalText = btn.textContent;
      btn.textContent = 'Message Sent!';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = originalText;
        btn.disabled = false;
        this.reset();
      }, 3000);
    });
  }

  // Pricing toggle (if applicable)
  const pricingToggle = document.querySelector('.pricing-toggle');
  if (pricingToggle) {
    pricingToggle.addEventListener('click', function() {
      document.querySelectorAll('.price-monthly, .price-yearly').forEach(el => {
        el.classList.toggle('hidden');
      });
      this.classList.toggle('yearly');
    });
  }

  // Score animation in hero mockup
  const scores = document.querySelectorAll('.score');
  if (scores.length > 0) {
    let homeScore = 18;
    let awayScore = 16;

    setInterval(() => {
      const scoringTeam = Math.random() > 0.5 ? 'home' : 'away';
      if (scoringTeam === 'home' && homeScore < 25) {
        homeScore++;
      } else if (scoringTeam === 'away' && awayScore < 25) {
        awayScore++;
      }

      // Reset if set ends
      if (homeScore >= 25 || awayScore >= 25) {
        homeScore = Math.floor(Math.random() * 10) + 10;
        awayScore = Math.floor(Math.random() * 10) + 10;
      }

      scores.forEach(score => {
        if (score.classList.contains('home')) {
          animateScore(score, homeScore);
        } else if (score.classList.contains('away')) {
          animateScore(score, awayScore);
        }
      });
    }, 3000);
  }

  function animateScore(element, newScore) {
    const currentScore = parseInt(element.textContent);
    if (currentScore !== newScore) {
      element.style.transform = 'scale(1.2)';
      setTimeout(() => {
        element.textContent = newScore;
        element.style.transform = 'scale(1)';
      }, 150);
    }
  }
});

// Active nav link highlighting
function setActiveNavLink() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

setActiveNavLink();
