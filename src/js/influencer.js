/* ========================================
   Influencer Page JavaScript
   荧耀传媒 - Creator Partnership Page
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize FAQ accordion
    initFaqAccordion();
    
    // Initialize smooth scroll
    initSmoothScroll();
    
    // Initialize WhatsApp tracking
    initWhatsAppTracking();
    
    // Initialize scroll animations
    initScrollAnimations();
    
    // Initialize mobile navigation
    initMobileNav();
    
    // Initialize legal modals
    initLegalModals();
    
    // Add parallax effect to floating cards
    initParallaxCards();
});

/**
 * FAQ Accordion
 */
function initFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(i => {
                if (i !== item) {
                    i.classList.remove('active');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
        });
        
        // Keyboard accessibility
        question.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                question.click();
            }
        });
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
 * WhatsApp click tracking
 */
function initWhatsAppTracking() {
    const whatsappLinks = document.querySelectorAll('a[href*="wa.me"]');
    
    whatsappLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Track WhatsApp clicks
            trackEvent('whatsapp_click', {
                source: 'influencer_page',
                button_type: link.classList.contains('floating-whatsapp') ? 'floating' : 'cta'
            });
            
            console.log('WhatsApp click tracked from Influencer page');
        });
    });
}

/**
 * Track events for analytics
 */
function trackEvent(eventName, params = {}) {
    // Google Analytics
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, params);
    }
    
    // Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('trackCustom', eventName, params);
    }
    
    // Console for development
    console.log('Event tracked:', eventName, params);
}

/**
 * Scroll animations
 */
function initScrollAnimations() {
    const animatedElements = [
        { selector: '.benefit-card', delay: 100 },
        { selector: '.process-step', delay: 150 },
        { selector: '.testimonial-card', delay: 100 },
        { selector: '.niche-tag', delay: 50 }
    ];
    
    animatedElements.forEach(({ selector, delay }) => {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = `all 0.5s ease ${index * delay}ms`;
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
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });
        
        elements.forEach(el => observer.observe(el));
    });
    
    // Section headers animation
    const headers = document.querySelectorAll('.section-header');
    
    const headerObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                headerObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    headers.forEach(header => {
        header.style.opacity = '0';
        header.style.transform = 'translateY(20px)';
        header.style.transition = 'all 0.6s ease';
        headerObserver.observe(header);
    });
    
    // Add CSS for visible state
    const style = document.createElement('style');
    style.textContent = `
        .section-header.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
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
 * Parallax effect for floating cards
 */
function initParallaxCards() {
    const cards = document.querySelectorAll('.floating-card');
    const heroVisual = document.querySelector('.hero-visual');
    
    if (!cards.length || !heroVisual) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let windowCenterX = window.innerWidth / 2;
    let windowCenterY = window.innerHeight / 2;
    
    // Update center on resize
    window.addEventListener('resize', () => {
        windowCenterX = window.innerWidth / 2;
        windowCenterY = window.innerHeight / 2;
    });
    
    // Track mouse movement
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    // Animate cards
    function animateCards() {
        const deltaX = (mouseX - windowCenterX) / windowCenterX;
        const deltaY = (mouseY - windowCenterY) / windowCenterY;
        
        cards.forEach((card, index) => {
            const speed = 10 + (index * 5);
            const x = deltaX * speed;
            const y = deltaY * speed;
            
            card.style.transform = `translate(${x}px, ${y}px)`;
        });
        
        requestAnimationFrame(animateCards);
    }
    
    // Only enable on desktop
    if (window.innerWidth > 1024) {
        animateCards();
    }
}

/**
 * Navbar scroll effect
 */
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

/**
 * Animate stats on scroll
 */
function animateStats() {
    const statValues = document.querySelectorAll('.stat-value');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const text = el.textContent;
                
                // Simple pulse animation for stats
                el.style.animation = 'statPulse 0.5s ease';
                
                observer.unobserve(el);
            }
        });
    }, {
        threshold: 0.5
    });
    
    statValues.forEach(stat => observer.observe(stat));
    
    // Add stat animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes statPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
    `;
    document.head.appendChild(style);
}

// Initialize stats animation
document.addEventListener('DOMContentLoaded', animateStats);

/**
 * Form validation (if using form instead of WhatsApp)
 */
function validateCreatorForm(formData) {
    const errors = [];
    
    if (!formData.platform) {
        errors.push('Please select your main platform');
    }
    
    if (!formData.followers || formData.followers < 1000) {
        errors.push('Please enter your follower count (minimum 1,000)');
    }
    
    if (!formData.niche) {
        errors.push('Please select your content niche');
    }
    
    if (!formData.handle) {
        errors.push('Please enter your social media handle');
    }
    
    return errors;
}

/**
 * Copy to clipboard utility
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied to clipboard!', 'success');
}

/**
 * Toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)'};
        color: white;
        padding: 12px 24px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.9375rem;
        font-weight: 500;
        z-index: 9999;
        box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Remove after delay
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export for potential use
window.influencerPage = {
    trackEvent,
    copyToClipboard,
    showToast,
    validateCreatorForm
};
