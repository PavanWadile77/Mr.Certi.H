// Landing page interactions
document.addEventListener('DOMContentLoaded', function () {
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 20) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });

  // Hamburger menu
  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      // simple toggle for mobile nav items
    });
  }

  // Open auth modal
  const authModal = document.getElementById('authModal');
  const openModal = () => { authModal.classList.add('active'); document.body.style.overflow = 'hidden'; };
  const closeModalFn = () => { authModal.classList.remove('active'); document.body.style.overflow = ''; };

  document.getElementById('loginNavBtn')?.addEventListener('click', openModal);
  document.getElementById('getStartedBtn')?.addEventListener('click', () => { openModal(); showSignup(); });
  document.getElementById('ctaBtn')?.addEventListener('click', () => { openModal(); showSignup(); });

  document.getElementById('closeModal')?.addEventListener('click', closeModalFn);
  authModal?.addEventListener('click', (e) => { if (e.target === authModal) closeModalFn(); });

  // Escape key
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModalFn(); });

  // Form switchers
  document.getElementById('switchToSignup')?.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
  document.getElementById('switchToLogin')?.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });
  document.getElementById('forgotPassLink')?.addEventListener('click', (e) => { e.preventDefault(); showForgot(); });
  document.getElementById('backToLogin')?.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });

  function showLogin() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('forgotForm').classList.remove('active');
  }
  function showSignup() {
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('forgotForm').classList.remove('active');
  }
  function showForgot() {
    document.getElementById('forgotForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.remove('active');
  }
  window.showLogin = showLogin;
  window.showSignup = showSignup;

  // Role selector
  document.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Password toggle
  const togglePw = (toggleId, inputId) => {
    document.getElementById(toggleId)?.addEventListener('click', () => {
      const input = document.getElementById(inputId);
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  };
  togglePw('toggleLoginPw', 'loginPassword');
  togglePw('toggleSignupPw', 'signupPassword');

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });

  // Animate stats on scroll
  const statNums = document.querySelectorAll('.stat-num');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = el.textContent;
        el.classList.add('counting');
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  statNums.forEach(n => observer.observe(n));

  // learnMore scroll
  document.getElementById('learnMoreBtn')?.addEventListener('click', () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  });
});
