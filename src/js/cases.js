/* ========================================
   Cases Page JavaScript
   荧耀传媒 - 成功案例交互
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Initialize chart animation
    initChartAnimation();
    
    // Initialize period buttons
    initPeriodButtons();
    
    // Initialize CTA diagnosis button
    initCtaDiagnosis();
});

/**
 * Animate the Keepa chart on scroll
 */
function initChartAnimation() {
    const chartContainer = document.querySelector('.keepa-chart-container');
    
    if (!chartContainer) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Trigger line animation
                const rankLine = document.querySelector('.rank-line');
                const rankLineGlow = document.querySelector('.rank-line-glow');
                
                if (rankLine) {
                    // Dynamically calculate path length for proper animation
                    const pathLength = rankLine.getTotalLength();
                    rankLine.style.strokeDasharray = pathLength;
                    rankLine.style.strokeDashoffset = pathLength;
                    
                    rankLine.style.animation = 'none';
                    rankLine.offsetHeight; // Trigger reflow
                    rankLine.style.animation = 'drawLine 2s ease-out forwards';
                }
                
                if (rankLineGlow) {
                    // Dynamically calculate path length for glow effect
                    const glowPathLength = rankLineGlow.getTotalLength();
                    rankLineGlow.style.strokeDasharray = glowPathLength;
                    rankLineGlow.style.strokeDashoffset = glowPathLength;
                    
                    rankLineGlow.style.animation = 'none';
                    rankLineGlow.offsetHeight; // Trigger reflow
                    rankLineGlow.style.animation = 'drawLine 2s ease-out forwards';
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.3
    });
    
    observer.observe(chartContainer);
}

/**
 * Period data configuration for different time ranges
 * Base date: 2026-01-09 (current date)
 * Using Bezier curves (C command) for smooth chart lines
 * Chart viewBox: 0 0 800 300
 */
const periodData = {
    '1M': {
        // Last 30 days: 2025-12-10 to 2026-01-09
        // Shows JRobling video effect - rank improving from #5000 to #156
        path: `M 0,120
               C 50,115 100,110 150,100
               C 200,90 250,75 300,60
               C 350,45 400,35 450,25
               C 500,18 550,12 600,10
               C 650,8 700,6 750,5
               L 800,5`,
        xLabels: ['12/10', '12/17', '12/24', '12/31', '01/09'],
        annotations: [
            { id: 'jrobling', left: '15%', top: '35%', label: 'JRobling视频', type: 'kol', visible: true }
        ],
        svgAnnotations: [
            { cx: 100, cy: 110, type: 'kol' }
        ],
        timelineFilter: (date) => {
            const d = new Date(date);
            const cutoff = new Date('2025-12-10');
            return d >= cutoff;
        }
    },
    '3M': {
        // Last 90 days: 2025-10-10 to 2026-01-09
        // Shows stabilization then JRobling boost
        path: `M 0,40
               C 50,45 100,50 150,55
               C 200,60 250,65 300,60
               C 350,55 400,45 450,35
               C 500,28 550,20 600,15
               C 650,10 700,8 750,6
               L 800,5`,
        xLabels: ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026'],
        annotations: [
            { id: 'jrobling', left: '55%', top: '10%', label: 'JRobling视频', type: 'kol', visible: true }
        ],
        svgAnnotations: [
            { cx: 450, cy: 35, type: 'kol' }
        ],
        timelineFilter: (date) => {
            const d = new Date(date);
            const cutoff = new Date('2025-10-10');
            return d >= cutoff;
        }
    },
    '1Y': {
        // Last 365 days: 2025-01-09 to 2026-01-09
        // Shows TikTok series, Compact review, Deal injection, JRobling
        path: `M 0,25
               C 50,30 100,40 150,60
               C 200,80 250,120 300,180
               C 350,220 400,250 450,275
               C 500,260 550,200 600,120
               C 650,60 700,30 750,15
               L 800,10`,
        xLabels: ['2025.01', '2025.04', '2025.07', '2025.10', '2026.01'],
        annotations: [
            { id: 'comm_quest', left: '8%', top: '8%', label: '@Comm_Quest', type: 'kol', visible: true },
            { id: 'compact', left: '25%', top: '18%', label: 'Compact视频', type: 'kol', visible: true },
            { id: 'deal', left: '50%', top: '85%', label: 'Deal 注入', type: 'deal', visible: true },
            { id: 'jrobling', left: '90%', top: '5%', label: 'JRobling视频', type: 'kol', visible: true }
        ],
        svgAnnotations: [
            { cx: 100, cy: 40, type: 'kol' },
            { cx: 200, cy: 80, type: 'kol' },
            { cx: 450, cy: 275, type: 'deal' },
            { cx: 750, cy: 15, type: 'kol' }
        ],
        timelineFilter: (date) => {
            const d = new Date(date);
            const cutoff = new Date('2025-01-09');
            return d >= cutoff;
        }
    },
    'ALL': {
        // All data: 2024-08-24 to 2026-01-09
        // Full story: ReviewsAndHowTos -> TikTok -> Compact -> Deal injection -> Recovery -> JRobling
        path: `M 0,20
               C 50,20 100,25 150,30
               C 200,35 250,280 300,275
               C 350,270 400,260 450,180
               C 500,100 550,60 600,40
               C 650,20 700,15 750,10
               L 800,5`,
        xLabels: ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026'],
        annotations: [
            { id: 'deal', left: '34%', top: '90%', label: 'Deal 注入', type: 'deal', visible: true },
            { id: 'kol', left: '58%', top: '55%', label: '红人视频发布', type: 'kol', visible: true }
        ],
        svgAnnotations: [
            { cx: 275, cy: 280, type: 'deal' },
            { cx: 475, cy: 170, type: 'kol' }
        ],
        timelineFilter: () => true // Show all
    }
};

/**
 * Period button switcher with full data filtering
 */
function initPeriodButtons() {
    const periodBtns = document.querySelectorAll('.period-btn');
    
    periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const period = btn.dataset.period;
            
            // Update active state
            periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Apply period filter with animation
            applyPeriodFilter(period);
        });
    });
}

/**
 * Apply period filter to all components
 */
function applyPeriodFilter(period) {
    const data = periodData[period];
    if (!data) return;
    
    const chartArea = document.querySelector('.chart-area');
    const rankLine = document.querySelector('.rank-line');
    const rankLineGlow = document.querySelector('.rank-line-glow');
    const xAxisContainer = document.querySelector('.chart-x-axis');
    const annotationsContainer = document.querySelector('.chart-annotations');
    const timelineItems = document.querySelectorAll('.timeline-item');
    
    // Fade out for transition
    if (chartArea) {
        chartArea.style.transition = 'opacity 0.3s ease';
        chartArea.style.opacity = '0.3';
    }
    
    setTimeout(() => {
        // Update SVG path - normalize the path string by removing newlines and extra spaces
        const normalizedPath = data.path.replace(/\s+/g, ' ').trim();
        
        if (rankLine && normalizedPath) {
            rankLine.setAttribute('d', normalizedPath);
            
            // Dynamically calculate path length for proper animation
            const pathLength = rankLine.getTotalLength();
            rankLine.style.strokeDasharray = pathLength;
            rankLine.style.strokeDashoffset = pathLength;
            
            // Re-trigger animation
            rankLine.style.animation = 'none';
            rankLine.offsetHeight; // Force reflow
            rankLine.style.animation = 'drawLine 1.5s ease-out forwards';
        }
        
        if (rankLineGlow && normalizedPath) {
            rankLineGlow.setAttribute('d', normalizedPath);
            
            // Dynamically calculate path length for glow effect
            const glowPathLength = rankLineGlow.getTotalLength();
            rankLineGlow.style.strokeDasharray = glowPathLength;
            rankLineGlow.style.strokeDashoffset = glowPathLength;
            
            rankLineGlow.style.animation = 'none';
            rankLineGlow.offsetHeight; // Force reflow
            rankLineGlow.style.animation = 'drawLine 1.5s ease-out forwards';
        }
        
        // Update SVG annotation markers (circles and dashed lines on the chart)
        const svgChart = document.querySelector('.rank-chart');
        if (svgChart && data.svgAnnotations) {
            // Remove ALL existing annotations (both original .annotation and dynamic .svg-annotation)
            const existingAnnotations = svgChart.querySelectorAll('.annotation, .svg-annotation');
            existingAnnotations.forEach(a => a.remove());
            
            // Add new SVG annotation markers
            data.svgAnnotations.forEach((ann) => {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', `svg-annotation ${ann.type}-annotation`);
                
                // Annotation circle
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', ann.cx);
                circle.setAttribute('cy', ann.cy);
                circle.setAttribute('r', '8');
                circle.setAttribute('fill', ann.type === 'deal' ? '#F97316' : '#8B5CF6');
                
                // Dashed line pointing up
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', ann.cx);
                line.setAttribute('y1', ann.cy - 15);
                line.setAttribute('x2', ann.cx);
                line.setAttribute('y2', ann.cy - 50);
                line.setAttribute('stroke', ann.type === 'deal' ? '#F97316' : '#8B5CF6');
                line.setAttribute('stroke-width', '2');
                line.setAttribute('stroke-dasharray', '4');
                
                g.appendChild(circle);
                g.appendChild(line);
                svgChart.appendChild(g);
            });
        }
        
        // Update X-axis labels
        if (xAxisContainer && data.xLabels) {
            xAxisContainer.innerHTML = data.xLabels.map(label => `<span>${label}</span>`).join('');
        }
        
        // Update HTML annotations (labels positioned absolutely)
        if (annotationsContainer && data.annotations) {
            annotationsContainer.innerHTML = data.annotations.map(ann => `
                <div class="annotation-label ${ann.type}" style="left: ${ann.left}; top: ${ann.top};">
                    <span class="annotation-dot" style="background: ${ann.type === 'deal' ? '#F97316' : '#8B5CF6'};"></span>
                    ${ann.label}
                </div>
            `).join('');
        }
        
        // Filter timeline items
        timelineItems.forEach(item => {
            const date = item.dataset.date;
            if (data.timelineFilter(date)) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Fade in
        if (chartArea) {
            chartArea.style.opacity = '1';
        }
    }, 300);
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
    console.log('Diagnosis requested for ASIN:', asin);
    
    // Google Analytics event
    if (typeof gtag !== 'undefined') {
        gtag('event', 'asin_diagnosis', {
            'event_category': 'Conversion',
            'event_label': asin,
            'page': 'cases'
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
    
    // Add styles if not present
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

/**
 * Animate metrics on scroll
 */
const metricsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const metrics = entry.target.querySelectorAll('.metric-value');
            metrics.forEach((metric, index) => {
                setTimeout(() => {
                    metric.style.animation = 'countUp 0.6s ease forwards';
                }, index * 100);
            });
            metricsObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.5
});

const caseMetrics = document.querySelector('.case-metrics');
if (caseMetrics) {
    metricsObserver.observe(caseMetrics);
}

/**
 * Add scroll reveal to case cards
 */
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            cardObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
});

document.querySelectorAll('.case-card, .testimonial-card').forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.5s ease ${index * 0.1}s`;
    cardObserver.observe(card);
});
