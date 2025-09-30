// API Configuration
const API_BASE_URL = '';

// Enhanced image loading with progressive loading
function loadImageWithProgress(img, src) {
  return new Promise((resolve, reject) => {
    const newImg = new Image();
    
    newImg.onload = () => {
      img.src = src;
      img.classList.add('loaded');
      resolve(img);
    };
    
    newImg.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    
    newImg.src = src;
  });
}

// Progressive image loading
function loadImagesProgressively() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        const src = img.getAttribute('data-src');
        const container = img.parentElement;
        const placeholder = container.querySelector('.image-placeholder');
        const spinner = container.querySelector('.loading-spinner');
        
        loadImageWithProgress(img, src)
          .then(() => {
            if (placeholder) placeholder.style.display = 'none';
            if (spinner) spinner.style.display = 'none';
          })
          .catch(error => {
            console.error('Error loading image:', error);
            if (placeholder) placeholder.style.display = 'none';
            if (spinner) spinner.style.display = 'none';
            img.alt = 'Failed to load image';
          });
        
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });
  
  images.forEach(img => {
    imageObserver.observe(img);
  });
}

// API Helper Function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
}

// Custom cursor
const cursor = document.querySelector('.camera-cursor');
const cursorDot = document.querySelector('.cursor-dot');

document.addEventListener('mousemove', (e) => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  cursorDot.style.left = (e.clientX - 4) + 'px';
  cursorDot.style.top = (e.clientY - 4) + 'px';
});

// Add hover effect to clickable elements
document.querySelectorAll('button, a, .portfolio-item').forEach(elem => {
  elem.addEventListener('mouseenter', () => {
    cursor.style.transform = 'scale(1.5)';
    cursorDot.style.transform = 'scale(2)';
  });
  elem.addEventListener('mouseleave', () => {
    cursor.style.transform = 'scale(1)';
    cursorDot.style.transform = 'scale(1)';
  });
});

// Navigation
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (window.scrollY > 100) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

// Page navigation
function navigateTo(pageName) {
  if (pageName === 'home' || pageName === 'portfolio' || pageName === 'about' || 
      pageName === 'services' || pageName === 'customers' || pageName === 'contact') {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');

    pages.forEach(page => page.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));

    const targetPage = document.getElementById(pageName);
    if (targetPage) {
      targetPage.classList.add('active');
    }
    
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) activeLink.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Nav link clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const pageName = e.target.dataset.page;
    if (pageName) {
      navigateTo(pageName);
    }
  });
});

// Animated counter
const animateValue = (element, start, end, duration) => {
  const range = end - start;
  const increment = end > start ? 1 : -1;
  const stepTime = Math.abs(Math.floor(duration / range));
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    element.textContent = current + (element.textContent.includes('%') ? '%' : '+');
    if (current === end) {
      clearInterval(timer);
    }
  }, stepTime);
};

// Intersection Observer for stats
const observerOptions = {
  threshold: 0.5
};

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
      const statNumbers = entry.target.querySelectorAll('.stat-number');
      statNumbers.forEach(num => {
        const target = parseInt(num.getAttribute('data-target'));
        animateValue(num, 0, target, 2000);
      });
      entry.target.classList.add('animated');
    }
  });
}, observerOptions);

const statsSection = document.querySelector('.stats-container');
if (statsSection) {
  statsObserver.observe(statsSection);
}

// Load Home Portfolio Items from API
async function loadHomePortfolioItems() {
  const grid = document.getElementById('homePortfolioGrid');
  
  try {
    const response = await apiCall('/api/home-portfolio');
    
    if (response && response.data && response.data.length > 0) {
      renderHomePortfolio(response.data);
    } else {
      renderHomePortfolio(getFallbackPortfolioItems());
    }
  } catch (error) {
    console.error('Failed to load home portfolio items:', error);
    renderHomePortfolio(getFallbackPortfolioItems());
  }
}

// Render Home Portfolio Items
function renderHomePortfolio(portfolioItems) {
  const grid = document.getElementById('homePortfolioGrid');
  grid.innerHTML = '';

  portfolioItems.forEach(item => {
    const portfolioItem = document.createElement('div');
    portfolioItem.className = 'portfolio-item';
    portfolioItem.style.cursor = 'pointer';
    
    portfolioItem.dataset.portfolioId = item.id || item._id || generateFallbackId();
    
    portfolioItem.innerHTML = `
      <div class="image-placeholder"></div>
      <div class="loading-spinner"></div>
      <img 
        src="" 
        data-src="${item.image}" 
        alt="${item.title}"
        onerror="this.src='https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop'"
      />
      <div class="portfolio-overlay">
        <div class="portfolio-category">${item.category}</div>
        <h3 class="portfolio-title">${item.title}</h3>
        <p class="portfolio-description">${item.description}</p>
      </div>
    `;
    
    portfolioItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const portfolioId = portfolioItem.dataset.portfolioId;
      window.location.href = `portfolio-gallery.html?id=${portfolioId}`;
    });
    
    grid.appendChild(portfolioItem);
    
    portfolioItem.addEventListener('mouseenter', () => {
      cursor.style.transform = 'scale(1.5)';
      cursorDot.style.transform = 'scale(2)';
    });
    portfolioItem.addEventListener('mouseleave', () => {
      cursor.style.transform = 'scale(1)';
      cursorDot.style.transform = 'scale(1)';
    });
  });
  
  setTimeout(loadImagesProgressively, 100);
}

// Fallback portfolio items
function getFallbackPortfolioItems() {
  return [
    {
      id: 'wedding-garden-romance',
      category: 'Weddings',
      title: 'Garden Romance',
      description: 'An enchanting outdoor ceremony',
      image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop',
      galleryType: 'wedding'
    },
    {
      id: 'portrait-urban-expression',
      category: 'Portraits',
      title: 'Urban Expression',
      description: 'Street style portrait session',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=600&fit=crop',
      galleryType: 'portrait'
    },
    {
      id: 'event-celebration-night',
      category: 'Events',
      title: 'Celebration Night',
      description: 'Corporate gala coverage',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
      galleryType: 'event'
    }
  ];
}

// Load Portfolio Items for Portfolio Page
async function loadPortfolioItems() {
  try {
    const response = await apiCall('/api/portfolio');
    
    if (response && response.data && response.data.length > 0) {
      renderPortfolioPage(response.data);
    } else {
      renderPortfolioPage(getFallbackPortfolioItems());
    }
  } catch (error) {
    console.error('Failed to load portfolio items:', error);
    renderPortfolioPage(getFallbackPortfolioItems());
  }
}

// Render Portfolio Page
function renderPortfolioPage(portfolioItems) {
  const gallery = document.getElementById('portfolioGallery');
  if (!gallery) return;

  gallery.innerHTML = '';
  
  portfolioItems.forEach(item => {
    const portfolioItem = document.createElement('div');
    portfolioItem.className = 'portfolio-item';
    portfolioItem.style.cursor = 'pointer';
    
    portfolioItem.dataset.portfolioId = item.id || item._id || generateFallbackId();
    
    const imageUrl = (item.images && item.images.length > 0) ? 
      item.images[0] : 
      item.image || 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop';
    
    portfolioItem.innerHTML = `
      <div class="image-placeholder"></div>
      <div class="loading-spinner"></div>
      <img 
        src="" 
        data-src="${imageUrl}" 
        alt="${item.title}"
        onerror="this.src='https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&h=600&fit=crop'"
      />
      <div class="portfolio-overlay">
        <div class="portfolio-category">${item.categoryName || item.category || 'Portfolio'}</div>
        <h3 class="portfolio-title">${item.title}</h3>
        <p class="portfolio-description">${item.description}</p>
      </div>
    `;
    
    portfolioItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const portfolioId = portfolioItem.dataset.portfolioId;
      window.location.href = `portfolio-gallery.html?id=${portfolioId}`;
    });
    
    gallery.appendChild(portfolioItem);
  });
  
  setTimeout(loadImagesProgressively, 100);
}

// Generate fallback ID for items without ID
function generateFallbackId() {
  return 'portfolio-' + Math.random().toString(36).substr(2, 9);
}

// WhatsApp Configuration
const WHATSAPP_NUMBER = '27739233855';

// Open WhatsApp with pre-filled message
function openWhatsApp() {
  const message = encodeURIComponent('Hi Mshasha, I would like to inquire about your photography services.');
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  window.open(whatsappUrl, '_blank');
}

// Show/hide WhatsApp float button based on active page
function updateWhatsAppVisibility() {
  const contactPage = document.getElementById('contact');
  const whatsappFloat = document.getElementById('whatsappFloat');
  
  if (contactPage && contactPage.classList.contains('active')) {
    whatsappFloat.style.display = 'flex';
  } else {
    whatsappFloat.style.display = 'none';
  }
}

// Contact form submission
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    service: formData.get('service'),
    message: formData.get('message')
  };
  
  const submitBtn = document.getElementById('submitBtn');
  const submitText = document.getElementById('submitText');
  const formAlert = document.getElementById('formAlert');
  
  try {
    submitBtn.disabled = true;
    submitText.textContent = 'Sending...';
    
    const response = await apiCall('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (response && response.success) {
      formAlert.style.display = 'block';
      formAlert.style.background = 'rgba(78, 205, 196, 0.2)';
      formAlert.style.border = '1px solid var(--secondary)';
      formAlert.style.color = 'var(--secondary)';
      formAlert.textContent = response.message || 'Message sent successfully! We will get back to you soon.';
      
      e.target.reset();
      
      formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch (error) {
    formAlert.style.display = 'block';
    formAlert.style.background = 'rgba(255, 107, 107, 0.2)';
    formAlert.style.border = '1px solid var(--primary)';
    formAlert.style.color = 'var(--primary)';
    formAlert.textContent = error.message || 'Failed to send message. Please try again or contact us via WhatsApp.';
    
    formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } finally {
    submitBtn.disabled = false;
    submitText.textContent = 'Send Message';
    
    setTimeout(() => {
      formAlert.style.display = 'none';
    }, 5000);
  }
});

// Initialize the application
async function initializeApp() {
  await loadHomePortfolioItems();
  await loadPortfolioItems();
  
  setTimeout(loadImagesProgressively, 100);
  
  const logo = document.querySelector('.logo-image');
  if (logo) {
    loadImageWithProgress(logo, logo.src)
      .then(() => {
        const placeholder = document.querySelector('.logo .image-placeholder');
        const spinner = document.querySelector('.logo .loading-spinner');
        if (placeholder) placeholder.style.display = 'none';
        if (spinner) spinner.style.display = 'none';
      })
      .catch(error => {
        console.error('Failed to load logo:', error);
      });
  }
  
  const aboutImage = document.querySelector('.about-image');
  if (aboutImage) {
    loadImageWithProgress(aboutImage, aboutImage.src)
      .then(() => {
        const placeholder = document.querySelector('.about-image-container .image-placeholder');
        const spinner = document.querySelector('.about-image-container .loading-spinner');
        if (placeholder) placeholder.style.display = 'none';
        if (spinner) spinner.style.display = 'none';
      })
      .catch(error => {
        console.error('Failed to load about image:', error);
      });
  }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Update the navigateTo function to control WhatsApp button
window.navigateTo = navigateTo;

// Add to nav link clicks
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    setTimeout(updateWhatsAppVisibility, 100);
  });
});

// Initialize WhatsApp visibility on page load
document.addEventListener('DOMContentLoaded', () => {
  updateWhatsAppVisibility();
});