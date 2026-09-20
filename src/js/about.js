/* ========================================
   About Page JavaScript
   荧耀传媒 - 关于我们页面
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize timeline animations
    initTimelineAnimations();
    
    // Initialize scroll animations for values
    initValuesAnimations();
    
    // Initialize founder card animation
    initFounderAnimation();
    
    // Initialize mobile navigation
    initMobileNav();
    
    // Initialize legal modals
    initLegalModals();
    
    // Initialize smooth scroll
    initSmoothScroll();
    
    // Initialize navbar scroll effect
    initNavbarScroll();
});

/**
 * Timeline scroll animations
 */
function initTimelineAnimations() {
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    if (!timelineItems.length) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Animate children with stagger
                const children = entry.target.querySelectorAll('.detail-card, .resource-item, .stat-block, .discovery-list li, .principle-list li');
                children.forEach((child, index) => {
                    setTimeout(() => {
                        child.style.opacity = '1';
                        child.style.transform = 'translateY(0)';
                    }, 100 + (index * 50));
                });
            }
        });
    }, {
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
    });
    
    // Set initial styles for animated children
    timelineItems.forEach(item => {
        const children = item.querySelectorAll('.detail-card, .resource-item, .stat-block, .discovery-list li, .principle-list li');
        children.forEach(child => {
            child.style.opacity = '0';
            child.style.transform = 'translateY(20px)';
            child.style.transition = 'all 0.4s ease';
        });
        
        observer.observe(item);
    });
}

/**
 * Values cards animation
 */
function initValuesAnimations() {
    const valueCards = document.querySelectorAll('.value-card');
    
    if (!valueCards.length) return;
    
    // Set initial state
    valueCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = `all 0.5s ease ${index * 100}ms`;
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const cards = entry.target.querySelectorAll('.value-card');
                cards.forEach(card => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                });
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    const valuesGrid = document.querySelector('.values-grid');
    if (valuesGrid) {
        observer.observe(valuesGrid);
    }
}

/**
 * Founder card animation
 */
function initFounderAnimation() {
    const founderCard = document.querySelector('.founder-card');
    
    if (!founderCard) return;
    
    founderCard.style.opacity = '0';
    founderCard.style.transform = 'translateY(40px)';
    founderCard.style.transition = 'all 0.6s ease';
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    observer.observe(founderCard);
}

/**
 * Mobile navigation
 */
function initMobileNav() {
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (!navToggle || !navMenu) return;
    
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        navToggle.classList.toggle('active');
        
        // Toggle icon
        const icon = navToggle.querySelector('i');
        if (icon) {
            const isActive = navMenu.classList.contains('active');
            icon.setAttribute('data-lucide', isActive ? 'x' : 'menu');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    });
    
    // Close menu on link click
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

/**
 * Legal modals
 */
function initLegalModals() {
    const legalLinks = document.querySelectorAll('.legal-link');
    
    legalLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalId = link.dataset.modal;
            const modal = document.getElementById(modalId + 'Modal');
            
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        });
    });
    
    // Close modal handlers
    document.querySelectorAll('.modal').forEach(modal => {
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(modal => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    });
}

/**
 * Smooth scroll for anchor links
 */
function initSmoothScroll() {
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    
    anchorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                
                const navHeight = document.querySelector('.navbar')?.offsetHeight || 0;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * Navbar scroll effect
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    const handleScroll = () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check
}

/**
 * Animate stats counters (optional enhancement)
 */
function animateCounter(element, target, duration = 1000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

/**
 * Section header animations
 */
function initSectionHeaders() {
    const headers = document.querySelectorAll('.section-header');
    
    headers.forEach(header => {
        header.style.opacity = '0';
        header.style.transform = 'translateY(20px)';
        header.style.transition = 'all 0.6s ease';
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    headers.forEach(header => observer.observe(header));
}

// Initialize section headers
document.addEventListener('DOMContentLoaded', initSectionHeaders);

/**
 * Parallax effect for hero decoration
 */
function initParallaxDecoration() {
    const decoration = document.querySelector('.hero-decoration');
    if (!decoration) return;
    
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const translateY = scrollY * 0.3;
        decoration.style.transform = `translateX(-50%) translateY(${translateY}px)`;
    });
}

// Initialize parallax
document.addEventListener('DOMContentLoaded', initParallaxDecoration);

// Export for potential use
window.aboutPage = {
    animateCounter
};
