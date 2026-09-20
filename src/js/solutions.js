/* ========================================
   Solutions Page JavaScript
   荧耀传媒 - 解决方案交互
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize timeline progress
    initTimelineProgress();
    
    // Initialize FAQ accordion
    initFaqAccordion();
    
    // Initialize CTA diagnosis
    initCtaDiagnosis();
    
    // Initialize legal modal
    initLegalModal();
    
    // Initialize scroll animations
    initScrollAnimations();
});

/**
 * Timeline progress interaction
 */
function initTimelineProgress() {
    const progressNodes = document.querySelectorAll('.progress-node');
    const progressFill = document.querySelector('.progress-fill');
    const phaseCards = document.querySelectorAll('.phase-card');
    
    if (!progressNodes.length || !progressFill) return;
    
    progressNodes.forEach((node, index) => {
        node.addEventListener('click', () => {
            // Update active node
            progressNodes.forEach(n => n.classList.remove('active'));
            node.classList.add('active');
            
            // Update progress fill
            const percentage = ((index + 1) / progressNodes.length) * 100;
            progressFill.style.width = `${percentage}%`;
            
            // Scroll to corresponding card
            if (phaseCards[index]) {
                phaseCards[index].scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                
                // Add highlight animation
                phaseCards[index].style.animation = 'pulseHighlight 0.6s ease';
                setTimeout(() => {
                    phaseCards[index].style.animation = '';
                }, 600);
            }
        });
    });
    
    // Update timeline based on scroll position
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const phase = entry.target.dataset.phase;
                const nodeIndex = parseInt(phase) - 1;
                
                progressNodes.forEach((n, i) => {
                    if (i <= nodeIndex) {
                        n.classList.add('active');
                    } else {
                        n.classList.remove('active');
                    }
                });
                
                const percentage = ((nodeIndex + 1) / progressNodes.length) * 100;
                progressFill.style.width = `${percentage}%`;
            }
        });
    }, {
        threshold: 0.5
    });
    
    phaseCards.forEach(card => {
        observer.observe(card);
    });
}

/**
 * FAQ accordion
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
    });
}

/**
 * CTA ASIN Diagnosis
 */
function initCtaDiagnosis() {
    const ctaBtn = document.getElementById('ctaDiagnoseBtn');
    const asinInput = document.querySelector('.cta-input-group .asin-input');
    const modal = document.getElementById('asinModal');
    
    if (!ctaBtn || !asinInput) return;
    
    ctaBtn.addEventListener('click', () => {
        const asin = asinInput.value.trim().toUpperCase();
        
        if (!asin) {
            showToast('请输入 ASIN', 'error');
            asinInput.focus();
            return;
        }
        
        if (!isValidASIN(asin)) {
            showToast('请输入有效的 ASIN（以 B0 开头的 10 位编码）', 'error');
            return;
        }
        
        // Show loading state
        ctaBtn.disabled = true;
        ctaBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> 分析中...';
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Simulate analysis
        setTimeout(() => {
            ctaBtn.disabled = false;
            ctaBtn.innerHTML = '<i data-lucide="search"></i> 免费诊断';
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // Show modal
            if (modal) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
            
            // Track conversion
            trackDiagnosis(asin);
        }, 2500);
    });
    
    // Enter key support
    asinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            ctaBtn.click();
        }
    });
    
    // Modal close handlers
    if (modal) {
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
    }
}

/**
 * Legal modal handlers
 */
function initLegalModal() {
    const legalLinks = document.querySelectorAll('.legal-link');
    const termsModal = document.getElementById('termsModal');
    
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
    
    // Close handlers for terms modal
    if (termsModal) {
        const closeBtn = termsModal.querySelector('.modal-close');
        const overlay = termsModal.querySelector('.modal-overlay');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                termsModal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
        
        if (overlay) {
            overlay.addEventListener('click', () => {
                termsModal.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
    }
    
    // ESC key to close modals
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
 * Scroll animations
 */
function initScrollAnimations() {
    const phaseCards = document.querySelectorAll('.phase-card');
    const journeySteps = document.querySelectorAll('.journey-step');
    const faqItems = document.querySelectorAll('.faq-item');
    
    // Phase cards stagger animation
    const cardObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 100);
                cardObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.2
    });
    
    phaseCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        card.style.transition = `all 0.5s ease ${index * 0.1}s`;
        cardObserver.observe(card);
    });
    
    // Journey steps animation
    const journeyObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const steps = entry.target.querySelectorAll('.journey-step');
                steps.forEach((step, index) => {
                    setTimeout(() => {
                        step.style.opacity = '1';
                        step.style.transform = 'translateY(0) scale(1)';
                    }, index * 80);
                });
                journeyObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    const journeyFlow = document.querySelector('.journey-flow');
    if (journeyFlow) {
        journeySteps.forEach(step => {
            step.style.opacity = '0';
            step.style.transform = 'translateY(20px) scale(0.9)';
            step.style.transition = 'all 0.4s ease';
        });
        journeyObserver.observe(journeyFlow);
    }
    
    // FAQ items animation
    const faqObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateX(0)';
                faqObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    
    faqItems.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'translateX(-20px)';
        item.style.transition = `all 0.4s ease ${index * 0.08}s`;
        faqObserver.observe(item);
    });
}

/**
 * Validate ASIN format
 */
function isValidASIN(asin) {
    const asinRegex = /^[A-Z0-9]{10}$/;
    return asinRegex.test(asin) && asin.startsWith('B0');
}

/**
 * Track diagnosis for analytics
 */
function trackDiagnosis(asin) {
    console.log('Diagnosis requested for ASIN:', asin, 'from Solutions page');
    
    // Google Analytics event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'asin_diagnosis', {
            'event_category': 'Conversion',
            'event_label': asin,
            'page': 'solutions'
        });
    }
}

/**
 * Toast notification
 */
function showToast(message, type = 'success') {
    // Check if main.js toast exists
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Fallback implementation
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: ${type === 'success' ? 'rgba(16, 185, 129, 0.9)' : 'rgba(239, 68, 68, 0.9)'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.9375rem;
        z-index: 9999;
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.transform = 'translateX(-50%) translateY(100px)';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// Add pulse highlight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes pulseHighlight {
        0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        50% { box-shadow: 0 0 30px 10px rgba(249, 115, 22, 0.3); }
    }
    
    .spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
