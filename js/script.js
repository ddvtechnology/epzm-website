/**
 * Escola Presbiteriana Zenaide Magalhães
 * Main JavaScript — navbar behavior, AOS init, small UX helpers
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
     Close mobile offcanvas after clicking a link
  ----------------------------------------------------------- */
  const offcanvasEl = document.getElementById('mobileMenu');
  if (offcanvasEl && window.bootstrap) {
    const offcanvasInstance = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    offcanvasEl.querySelectorAll('a.nav-link, a.dropdown-item, a.btn-ez').forEach((el) => {
      el.addEventListener('click', () => offcanvasInstance.hide());
    });
  }

  /* -----------------------------------------------------------
     Smooth scroll offset compensation for fixed navbar
  ----------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
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
     Current year in footer
  ----------------------------------------------------------- */
  const yearEl = document.getElementById('currentYear');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

});
