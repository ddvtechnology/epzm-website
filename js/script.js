/**
 * Escola Presbiteriana Zenaide Magalhães
 * Main JavaScript — navbar behavior, AOS init, mobile offcanvas, back-to-top
 */

document.addEventListener('DOMContentLoaded', function () {

  /* -----------------------------------------------------------
     AOS — Animate On Scroll
  ----------------------------------------------------------- */
  if (window.AOS) {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
    });
  }

  /* -----------------------------------------------------------
     Navbar: shrink + blur on scroll
  ----------------------------------------------------------- */
  const navbar = document.querySelector('.main-navbar');
  const SCROLL_THRESHOLD = 40;

  function handleNavbarScroll() {
    if (!navbar) return;
    if (window.scrollY > SCROLL_THRESHOLD) {
      navbar.classList.add('is-scrolled');
    } else {
      navbar.classList.remove('is-scrolled');
    }
  }

  handleNavbarScroll();
  window.addEventListener('scroll', handleNavbarScroll, { passive: true });

  /* -----------------------------------------------------------
     Active nav link on scroll (scrollspy-lite)
  ----------------------------------------------------------- */
  const sections = document.querySelectorAll('main section[id]');
  const navLinks = document.querySelectorAll('.nav-menu .nav-link[href^="#"]');

  function setActiveLink() {
    let currentId = '';
    const scrollPos = window.scrollY + (navbar ? navbar.offsetHeight : 0) + 40;

    sections.forEach((section) => {
      if (scrollPos >= section.offsetTop) {
        currentId = section.getAttribute('id');
      }
    });

    navLinks.forEach((link) => {
      link.parentElement.classList.remove('active');
      if (link.getAttribute('href') === '#' + currentId) {
        link.parentElement.classList.add('active');
      }
    });
  }

  if (sections.length) {
    setActiveLink();
    window.addEventListener('scroll', setActiveLink, { passive: true });
  }

  /* -----------------------------------------------------------
     Close mobile offcanvas after clicking a navigation link
  ----------------------------------------------------------- */
  const offcanvasEl = document.getElementById('mobileMenu');
  if (offcanvasEl && window.bootstrap) {
    const offcanvasInstance = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    offcanvasEl.querySelectorAll('a[href^="#"]').forEach((el) => {
      el.addEventListener('click', function () {
        // Do not close offcanvas if clicking accordion trigger
        if (!this.hasAttribute('data-bs-toggle')) {
          offcanvasInstance.hide();
        }
      });
    });
  }

  /* -----------------------------------------------------------
     Smooth scroll offset compensation for fixed navbar
  ----------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      if (this.hasAttribute('data-bs-toggle')) return; // Ignore collapse toggles

      const targetId = this.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const offset = (navbar ? navbar.offsetHeight : 0) + 10;
          const top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    });
  });

  /* -----------------------------------------------------------
     Back-to-Top Button logic
  ----------------------------------------------------------- */
  const backToTopBtn = document.getElementById('backToTopBtn');
  if (backToTopBtn) {
    function handleBackToTopVisibility() {
      if (window.scrollY > 350) {
        backToTopBtn.classList.add('is-visible');
      } else {
        backToTopBtn.classList.remove('is-visible');
      }
    }

    handleBackToTopVisibility();
    window.addEventListener('scroll', handleBackToTopVisibility, { passive: true });

    backToTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* -----------------------------------------------------------
     Current year in footer
  ----------------------------------------------------------- */
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

});
