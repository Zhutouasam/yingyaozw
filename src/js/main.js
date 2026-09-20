/**
 * 荧耀传媒 - 主交互脚本
 * Yingyao Media - Main JavaScript
 * Version: 2.0.1 - Mobile Menu Fix - 2026-01-13
 */

console.log('[Main.js] Version 2.0.1 loaded at', new Date().toISOString());

// ==================== DOM Ready ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize all components
    initNavigation();
    initASINDiagnosis();
    initModals();
});

// ==================== Navigation ====================
function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    // 创建移动端菜单遮罩层
    let overlay = document.querySelector('.mobile-menu-overlay');
    if (!overlay && mobileMenuBtn) {
        overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        document.body.appendChild(overlay);
    }
    
    // Scroll effect for navbar
    let lastScrollY = window.scrollY;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(11, 15, 25, 0.95)';
        } else {
            navbar.style.background = 'rgba(11, 15, 25, 0.8)';
        }
        
        lastScrollY = window.scrollY;
    });
    
    /**
     * 关闭移动端菜单
     */
    function closeMobileMenu() {
        if (!navLinks || !mobileMenuBtn) return;
        
        navLinks.classList.remove('mobile-active');
        if (overlay) {
            overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
        
        // 更新图标
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', 'menu');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
    
    /**
     * 打开移动端菜单
     */
    function openMobileMenu() {
        if (!navLinks || !mobileMenuBtn) {
            console.log('[Navigation] openMobileMenu: navLinks or mobileMenuBtn is null');
            return;
        }
        
        console.log('[Navigation] openMobileMenu: Adding mobile-active class');
        console.log('[Navigation] navLinks classList before:', navLinks.classList.toString());
        
        navLinks.classList.add('mobile-active');
        
        console.log('[Navigation] navLinks classList after:', navLinks.classList.toString());
        console.log('[Navigation] navLinks has mobile-active:', navLinks.classList.contains('mobile-active'));
        
        if (overlay) {
            overlay.classList.add('active');
        }
        document.body.style.overflow = 'hidden';
        
        // 更新图标
        const icon = mobileMenuBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', 'x');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
        
        // 检查计算样式
        const computedStyle = window.getComputedStyle(navLinks);
        console.log('[Navigation] navLinks computed transform:', computedStyle.transform);
        console.log('[Navigation] navLinks computed visibility:', computedStyle.visibility);
    }
    
    /**
     * 切换移动端菜单状态
     */
    function toggleMobileMenu() {
        console.log('[Navigation] toggleMobileMenu called');
        console.log('[Navigation] navLinks:', navLinks);
        console.log('[Navigation] navLinks has mobile-active:', navLinks ? navLinks.classList.contains('mobile-active') : 'N/A');
        
        if (navLinks && navLinks.classList.contains('mobile-active')) {
            console.log('[Navigation] Calling closeMobileMenu');
            closeMobileMenu();
        } else {
            console.log('[Navigation] Calling openMobileMenu');
            openMobileMenu();
        }
    }
    
    // Mobile menu toggle - 点击汉堡按钮
    console.log('[Navigation] Initializing mobile menu...');
    console.log('[Navigation] mobileMenuBtn found:', !!mobileMenuBtn);
    console.log('[Navigation] navLinks found:', !!navLinks);
    
    if (mobileMenuBtn && navLinks) {
        // 使用简化的事件处理器，添加 try-catch 捕获错误
        mobileMenuBtn.addEventListener('click', function(e) {
            try {
                console.log('[Navigation] === Click event started ===');
                e.preventDefault();
                e.stopPropagation();
                
                // 检查当前状态
                const isActive = navLinks.classList.contains('mobile-active');
                console.log('[Navigation] Current state - isActive:', isActive);
                
                if (isActive) {
                    // 关闭菜单
                    console.log('[Navigation] Closing menu...');
                    navLinks.classList.remove('mobile-active');
                    if (overlay) overlay.classList.remove('active');
                    document.body.style.overflow = '';
                    
                    // 移除内联样式，恢复CSS控制
                    navLinks.style.cssText = '';
                    
                    // 更新图标
                    const icon = mobileMenuBtn.querySelector('i, svg');
                    if (icon) {
                        icon.setAttribute('data-lucide', 'menu');
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
                } else {
                    // 打开菜单
                    console.log('[Navigation] Opening menu...');
                    navLinks.classList.add('mobile-active');
                    if (overlay) overlay.classList.add('active');
                    document.body.style.overflow = 'hidden';
                    
                    // 强制应用内联样式，确保菜单显示
                    navLinks.style.cssText = `
                        display: flex !important;
                        position: fixed !important;
                        top: 72px !important;
                        left: 0 !important;
                        right: 0 !important;
                        bottom: 0 !important;
                        width: 100% !important;
                        height: calc(100vh - 72px) !important;
                        flex-direction: column !important;
                        align-items: stretch !important;
                        justify-content: flex-start !important;
                        gap: 0 !important;
                        background: #0B0F19 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        z-index: 10000 !important;
                        overflow-y: auto !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                    `;
                    
                    // 更新图标
                    const icon = mobileMenuBtn.querySelector('i, svg');
                    if (icon) {
                        icon.setAttribute('data-lucide', 'x');
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }
                }
                
                // 验证结果
                console.log('[Navigation] After toggle - hasClass:', navLinks.classList.contains('mobile-active'));
                console.log('[Navigation] === Click event completed ===');
                
            } catch (error) {
                console.error('[Navigation] ERROR in click handler:', error);
                console.error('[Navigation] Error stack:', error.stack);
            }
        });
        
        // 点击遮罩层关闭菜单
        if (overlay) {
            overlay.addEventListener('click', closeMobileMenu);
        }
        
        // 点击导航链接后关闭菜单
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                // 延迟关闭，让用户看到点击效果
                setTimeout(closeMobileMenu, 150);
            });
        });
        
        // 按 Escape 键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navLinks.classList.contains('mobile-active')) {
                closeMobileMenu();
            }
        });
        
        // 窗口大小改变时，如果变为桌面端则关闭菜单
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && navLinks.classList.contains('mobile-active')) {
                closeMobileMenu();
            }
        });
    }
}

// ==================== ASIN Diagnosis ====================
function initASINDiagnosis() {
    const asinInput = document.getElementById('asinInput');
    const diagnoseBtn = document.getElementById('diagnoseBtn');
    const diagnosisModal = document.getElementById('diagnosisModal');
    const resultAsin = document.getElementById('resultAsin');
    
    if (!diagnoseBtn || !asinInput) return;
    
    // Input validation - ASIN format
    asinInput.addEventListener('input', (e) => {
        // Auto uppercase and remove invalid characters
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        e.target.value = value;
    });
    
    // Enter key support
    asinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            diagnoseBtn.click();
        }
    });
    
    // Diagnose button click
    diagnoseBtn.addEventListener('click', async () => {
        const asin = asinInput.value.trim();
        
        // Validate ASIN
        if (!isValidASIN(asin)) {
            showToast('请输入有效的 ASIN (10位字母数字组合，以 B0 开头)', 'error');
            asinInput.focus();
            return;
        }
        
        // Start loading state
        diagnoseBtn.classList.add('loading');
        diagnoseBtn.disabled = true;
        
        // Simulate analysis process
        await simulateAnalysis();
        
        // Reset button state
        diagnoseBtn.classList.remove('loading');
        diagnoseBtn.disabled = false;
        
        // Update result and show modal
        if (resultAsin) {
            resultAsin.textContent = asin;
        }
        
        openModal(diagnosisModal);
        
        // Animate metrics after modal opens
        setTimeout(() => {
            animateMetrics();
        }, 300);
    });
}

/**
 * Validate ASIN format
 * Standard Amazon ASIN: 10 characters, starts with B0
 */
function isValidASIN(asin) {
    // Basic ASIN validation: 10 alphanumeric characters
    const asinRegex = /^[A-Z0-9]{10}$/;
    
    // Must start with B0 (standard product ASIN)
    const startsWithB0 = asin.startsWith('B0');
    
    return asinRegex.test(asin) && startsWithB0;
}

/**
 * Simulate analysis process with progress animation
 */
function simulateAnalysis() {
    return new Promise((resolve) => {
        // Total simulation time: 2.5 seconds
        setTimeout(resolve, 2500);
    });
}

/**
 * Animate the metrics bars in the modal
 */
function animateMetrics() {
    const metricFills = document.querySelectorAll('.metric-fill');
    metricFills.forEach((fill, index) => {
        // Reset width first
        fill.style.width = '0%';
        
        // Animate to target width
        setTimeout(() => {
            const targetWidth = fill.parentElement.parentElement.querySelector('.metric-value')?.textContent || '0%';
            fill.style.width = targetWidth;
        }, index * 200);
    });
}

// ==================== Modal System ====================
function initModals() {
    // Diagnosis Modal
    const diagnosisModal = document.getElementById('diagnosisModal');
    const modalClose = document.getElementById('modalClose');
    
    if (diagnosisModal && modalClose) {
        modalClose.addEventListener('click', () => closeModal(diagnosisModal));
        
        const overlay = diagnosisModal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => closeModal(diagnosisModal));
        }
    }
    
    // Terms Modal (legacy support for #termsBtn)
    const termsModal = document.getElementById('termsModal');
    const termsBtn = document.getElementById('termsBtn');
    const termsClose = document.getElementById('termsClose');
    
    if (termsModal && termsBtn) {
        termsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(termsModal);
        });
    }
    
    if (termsModal && termsClose) {
        termsClose.addEventListener('click', () => closeModal(termsModal));
        
        const overlay = termsModal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => closeModal(termsModal));
        }
    }
    
    // Generic Legal Links Handler (for data-modal attribute pattern)
    // Handles both "服务条款" and "隐私政策" links
    document.querySelectorAll('.legal-link[data-modal]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const modalType = link.getAttribute('data-modal');
            const modalId = modalType + 'Modal';
            const modal = document.getElementById(modalId);
            if (modal) {
                openModal(modal);
            }
        });
    });
    
    // Generic Modal Close Button Handler
    // Handles all .modal-close buttons inside modals
    document.querySelectorAll('.modal .modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            const modal = closeBtn.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });
    
    // Generic Modal Overlay Click Handler
    // Handles all .modal-overlay clicks to close modals
    document.querySelectorAll('.modal .modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', () => {
            const modal = overlay.closest('.modal');
            if (modal) {
                closeModal(modal);
            }
        });
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                closeModal(activeModal);
            }
        }
    });
}

/**
 * Open a modal
 */
function openModal(modal) {
    if (!modal) return;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Focus trap
    const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
}

/**
 * Close a modal
 */
function closeModal(modal) {
    if (!modal) return;
    
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

// ==================== Toast Notifications ====================
/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', 'warning', 'info'
 */
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i data-lucide="x"></i>
        </button>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#toast-styles')) {
        const styles = document.createElement('style');
        styles.id = 'toast-styles';
        styles.textContent = `
            .toast {
                position: fixed;
                bottom: 24px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 20px;
                background: rgba(31, 41, 55, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                z-index: 1000;
                animation: toastIn 0.3s ease forwards;
            }
            
            .toast.toast-error {
                border-color: rgba(239, 68, 68, 0.5);
            }
            
            .toast.toast-success {
                border-color: rgba(16, 185, 129, 0.5);
            }
            
            .toast.toast-warning {
                border-color: rgba(245, 158, 11, 0.5);
            }
            
            .toast-message {
                font-size: 14px;
                color: #fff;
            }
            
            .toast-close {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                background: none;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                border-radius: 4px;
                transition: all 0.2s;
            }
            
            .toast-close:hover {
                color: #fff;
                background: rgba(255, 255, 255, 0.1);
            }
            
            .toast-close svg {
                width: 14px;
                height: 14px;
            }
            
            @keyframes toastIn {
                to {
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(toast);
    
    // Reinitialize icons for the close button
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'toastIn 0.3s ease reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// ==================== Utility Functions ====================

/**
 * Smooth scroll to element
 */
function scrollToElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Debounce function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== Analytics & Tracking ====================
/**
 * Track events (placeholder for analytics integration)
 */
function trackEvent(eventName, eventData = {}) {
    // Console log for development
    console.log('[Analytics]', eventName, eventData);
    
    // Google Analytics 4 (if available)
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Facebook Pixel (if available)
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, eventData);
    }
}

// Track ASIN diagnosis
document.addEventListener('DOMContentLoaded', () => {
    const diagnoseBtn = document.getElementById('diagnoseBtn');
    if (diagnoseBtn) {
        diagnoseBtn.addEventListener('click', () => {
            const asinInput = document.getElementById('asinInput');
            if (asinInput && isValidASIN(asinInput.value)) {
                trackEvent('asin_diagnosis_start', {
                    asin: asinInput.value
                });
            }
        });
    }
});

// ==================== Intersection Observer for Animations ====================
document.addEventListener('DOMContentLoaded', () => {
    // Animate elements when they come into view
    const animateOnScroll = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                animateOnScroll.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Add animation classes
    const style = document.createElement('style');
    style.textContent = `
        .animate-target {
            opacity: 0;
            transform: translateY(30px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        
        .animate-target.animate-in {
            opacity: 1;
            transform: translateY(0);
        }
        
        .service-card.animate-target:nth-child(2) {
            transition-delay: 0.1s;
        }
        
        .service-card.animate-target:nth-child(3) {
            transition-delay: 0.2s;
        }
    `;
    document.head.appendChild(style);
    
    // Observe service cards
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.add('animate-target');
        animateOnScroll.observe(card);
    });
    
    // Observe CTA cards
    document.querySelectorAll('.cta-card').forEach(card => {
        card.classList.add('animate-target');
        animateOnScroll.observe(card);
    });
});

// ==================== WhatsApp Integration ====================
/**
 * Generate WhatsApp link with pre-filled message
 */
function getWhatsAppLink(phone, message) {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${phone}?text=${encodedMessage}`;
}

// Update WhatsApp buttons with proper links
document.addEventListener('DOMContentLoaded', () => {
    const whatsappBtns = document.querySelectorAll('.btn-whatsapp');
    
    whatsappBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            trackEvent('whatsapp_click', {
                location: btn.closest('.cta-card')?.classList.contains('influencer-cta') 
                    ? 'influencer_section' 
                    : 'general'
            });
        });
    });
});

// ==================== Mobile Responsive Helpers ====================
/**
 * Check if device is mobile
 */
function isMobile() {
    return window.innerWidth <= 768;
}

/**
 * Check if device is tablet
 */
function isTablet() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
}

// Handle responsive adjustments
window.addEventListener('resize', debounce(() => {
    // Re-initialize icons after resize
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}, 250));
