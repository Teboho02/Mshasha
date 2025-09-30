// Mobile Menu Toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
let navOverlay = null;

// Create overlay element
function createOverlay() {
  if (!navOverlay) {
    navOverlay = document.createElement('div');
    navOverlay.className = 'nav-overlay';
    document.body.appendChild(navOverlay);
    
    navOverlay.addEventListener('click', closeMobileMenu);
  }
}

function openMobileMenu() {
  createOverlay();
  hamburger.classList.add('active');
  navLinks.classList.add('active');
  navOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
  hamburger.classList.remove('active');
  navLinks.classList.remove('active');
  if (navOverlay) {
    navOverlay.classList.remove('active');
  }
  document.body.style.overflow = 'auto';
}

hamburger.addEventListener('click', () => {
  if (navLinks.classList.contains('active')) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
});

// Close menu when clicking on a nav link
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      closeMobileMenu();
    }
  });
});

// Close menu when window is resized to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});