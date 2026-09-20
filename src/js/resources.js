/* ========================================
   Resources Page JavaScript
   荧耀传媒 - 资源库交互
   ======================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tabs
    initTabs();
    
    // Initialize Deal Logo Carousel
    initDealsCarousel();
    
    // Initialize FB Group Carousel
    initFbgroupCarousel();
    
    // Initialize TikTok KOL Carousel
    initTkkolCarousel();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

/**
 * ========================================
 * Deal Logo 轮播组件
 * 功能：自动轮播、手动切换、响应式适配
 * ========================================
 */
function initDealsCarousel() {
    const track = document.getElementById('dealsCarouselTrack');
    const dotsContainer = document.getElementById('carouselDots');
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    
    // 如果轮播元素不存在，退出
    if (!track || !dotsContainer) return;
    
    const slides = track.querySelectorAll('.carousel-slide');
    const totalSlides = slides.length;
    
    // 轮播配置
    const config = {
        autoPlayInterval: 4000,     // 自动轮播间隔（毫秒）
        transitionDuration: 500,    // 过渡动画时长（毫秒）
        pauseOnHover: true,         // 鼠标悬停时暂停
        loop: true                  // 循环轮播
    };
    
    let currentIndex = 0;
    let autoPlayTimer = null;
    let slidesPerView = getSlidesPerView();
    let totalPages = Math.ceil(totalSlides / slidesPerView);
    
    /**
     * 根据屏幕宽度获取每次显示的幻灯片数量
     */
    function getSlidesPerView() {
        const width = window.innerWidth;
        if (width <= 640) return 1;      // 手机：1个
        if (width <= 992) return 2;      // 平板：2个
        return 3;                        // 桌面：3个
    }
    
    /**
     * 更新轮播位置
     */
    function updateCarousel(animate = true) {
        const slideWidth = 100 / slidesPerView;
        const offset = currentIndex * slideWidth;
        
        if (animate) {
            track.style.transition = `transform ${config.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        } else {
            track.style.transition = 'none';
        }
        
        track.style.transform = `translateX(-${offset}%)`;
        
        // 更新指示点状态
        updateDots();
    }
    
    /**
     * 生成指示点
     */
    function createDots() {
        dotsContainer.innerHTML = '';
        totalPages = Math.ceil(totalSlides / slidesPerView);
        
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `跳转到第 ${i + 1} 页`);
            dot.dataset.index = i;
            
            dot.addEventListener('click', () => {
                goToPage(i);
                resetAutoPlay();
            });
            
            dotsContainer.appendChild(dot);
        }
    }
    
    /**
     * 更新指示点状态
     */
    function updateDots() {
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        const currentPage = Math.floor(currentIndex / slidesPerView);
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }
    
    /**
     * 跳转到指定页
     */
    function goToPage(pageIndex) {
        currentIndex = pageIndex * slidesPerView;
        
        // 确保不超出范围
        const maxIndex = totalSlides - slidesPerView;
        if (currentIndex > maxIndex) {
            currentIndex = maxIndex;
        }
        if (currentIndex < 0) {
            currentIndex = 0;
        }
        
        updateCarousel();
    }
    
    /**
     * 下一页
     */
    function nextSlide() {
        currentIndex += slidesPerView;
        
        // 循环逻辑
        if (currentIndex >= totalSlides) {
            if (config.loop) {
                currentIndex = 0;
            } else {
                currentIndex = totalSlides - slidesPerView;
            }
        }
        
        updateCarousel();
    }
    
    /**
     * 上一页
     */
    function prevSlide() {
        currentIndex -= slidesPerView;
        
        // 循环逻辑
        if (currentIndex < 0) {
            if (config.loop) {
                // 跳转到最后一页
                const maxIndex = totalSlides - slidesPerView;
                currentIndex = Math.floor(maxIndex / slidesPerView) * slidesPerView;
            } else {
                currentIndex = 0;
            }
        }
        
        updateCarousel();
    }
    
    /**
     * 开始自动轮播
     */
    function startAutoPlay() {
        if (autoPlayTimer) return;
        
        autoPlayTimer = setInterval(() => {
            nextSlide();
        }, config.autoPlayInterval);
    }
    
    /**
     * 停止自动轮播
     */
    function stopAutoPlay() {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }
    
    /**
     * 重置自动轮播
     */
    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }
    
    /**
     * 处理窗口大小变化
     */
    function handleResize() {
        const newSlidesPerView = getSlidesPerView();
        
        if (newSlidesPerView !== slidesPerView) {
            slidesPerView = newSlidesPerView;
            currentIndex = 0;
            createDots();
            updateCarousel(false);
        }
    }
    
    /**
     * 触摸滑动支持
     */
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;
    
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        stopAutoPlay();
    }
    
    function handleTouchMove(e) {
        touchEndX = e.touches[0].clientX;
    }
    
    function handleTouchEnd() {
        const swipeDistance = touchStartX - touchEndX;
        
        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // 向左滑动 -> 下一页
                nextSlide();
            } else {
                // 向右滑动 -> 上一页
                prevSlide();
            }
        }
        
        startAutoPlay();
    }
    
    // ========================================
    // 事件绑定
    // ========================================
    
    // 箭头按钮点击
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoPlay();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoPlay();
        });
    }
    
    // 鼠标悬停暂停
    if (config.pauseOnHover) {
        const carousel = document.querySelector('.deals-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', stopAutoPlay);
            carousel.addEventListener('mouseleave', startAutoPlay);
        }
    }
    
    // 触摸事件
    track.addEventListener('touchstart', handleTouchStart, { passive: true });
    track.addEventListener('touchmove', handleTouchMove, { passive: true });
    track.addEventListener('touchend', handleTouchEnd);
    
    // 窗口大小变化
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 200);
    });
    
    // 页面可见性变化（标签页切换时暂停）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });
    
    // ========================================
    // 初始化
    // ========================================
    createDots();
    updateCarousel(false);
    startAutoPlay();
    
    // 调试日志
    console.log('Deals Carousel initialized:', {
        totalSlides,
        slidesPerView,
        totalPages
    });
}

/**
 * ========================================
 * FB Group 轮播组件
 * 功能：自动轮播、手动切换、响应式适配
 * ========================================
 */
function initFbgroupCarousel() {
    const track = document.getElementById('fbgroupCarouselTrack');
    const dotsContainer = document.getElementById('fbgroupCarouselDots');
    const prevBtn = document.querySelector('.fbgroup-prev');
    const nextBtn = document.querySelector('.fbgroup-next');
    
    // 如果轮播元素不存在，退出
    if (!track || !dotsContainer) return;
    
    const slides = track.querySelectorAll('.fbgroup-slide');
    const totalSlides = slides.length;
    
    // 轮播配置
    const config = {
        autoPlayInterval: 5000,     // 自动轮播间隔（毫秒）- 比 Deal 站稍慢
        transitionDuration: 500,    // 过渡动画时长（毫秒）
        pauseOnHover: true,         // 鼠标悬停时暂停
        loop: true                  // 循环轮播
    };
    
    let currentIndex = 0;
    let autoPlayTimer = null;
    let slidesPerView = getSlidesPerView();
    let totalPages = Math.ceil(totalSlides / slidesPerView);
    
    /**
     * 根据屏幕宽度获取每次显示的幻灯片数量
     */
    function getSlidesPerView() {
        const width = window.innerWidth;
        if (width <= 640) return 1;      // 手机：1个
        if (width <= 992) return 2;      // 平板：2个
        return 3;                        // 桌面：3个
    }
    
    /**
     * 更新轮播位置
     */
    function updateCarousel(animate = true) {
        const slideWidth = 100 / slidesPerView;
        const offset = currentIndex * slideWidth;
        
        if (animate) {
            track.style.transition = `transform ${config.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        } else {
            track.style.transition = 'none';
        }
        
        track.style.transform = `translateX(-${offset}%)`;
        
        // 更新指示点状态
        updateDots();
    }
    
    /**
     * 生成指示点
     */
    function createDots() {
        dotsContainer.innerHTML = '';
        totalPages = Math.ceil(totalSlides / slidesPerView);
        
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `跳转到第 ${i + 1} 页`);
            dot.dataset.index = i;
            
            dot.addEventListener('click', () => {
                goToPage(i);
                resetAutoPlay();
            });
            
            dotsContainer.appendChild(dot);
        }
    }
    
    /**
     * 更新指示点状态
     */
    function updateDots() {
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        const currentPage = Math.floor(currentIndex / slidesPerView);
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }
    
    /**
     * 跳转到指定页
     */
    function goToPage(pageIndex) {
        currentIndex = pageIndex * slidesPerView;
        
        // 确保不超出范围
        const maxIndex = totalSlides - slidesPerView;
        if (currentIndex > maxIndex) {
            currentIndex = maxIndex;
        }
        if (currentIndex < 0) {
            currentIndex = 0;
        }
        
        updateCarousel();
    }
    
    /**
     * 下一页
     */
    function nextSlide() {
        currentIndex += slidesPerView;
        
        // 循环逻辑
        if (currentIndex >= totalSlides) {
            if (config.loop) {
                currentIndex = 0;
            } else {
                currentIndex = totalSlides - slidesPerView;
            }
        }
        
        updateCarousel();
    }
    
    /**
     * 上一页
     */
    function prevSlide() {
        currentIndex -= slidesPerView;
        
        // 循环逻辑
        if (currentIndex < 0) {
            if (config.loop) {
                // 跳转到最后一页
                const maxIndex = totalSlides - slidesPerView;
                currentIndex = Math.floor(maxIndex / slidesPerView) * slidesPerView;
            } else {
                currentIndex = 0;
            }
        }
        
        updateCarousel();
    }
    
    /**
     * 开始自动轮播
     */
    function startAutoPlay() {
        if (autoPlayTimer) return;
        
        autoPlayTimer = setInterval(() => {
            nextSlide();
        }, config.autoPlayInterval);
    }
    
    /**
     * 停止自动轮播
     */
    function stopAutoPlay() {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }
    
    /**
     * 重置自动轮播
     */
    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }
    
    /**
     * 处理窗口大小变化
     */
    function handleResize() {
        const newSlidesPerView = getSlidesPerView();
        
        if (newSlidesPerView !== slidesPerView) {
            slidesPerView = newSlidesPerView;
            currentIndex = 0;
            createDots();
            updateCarousel(false);
        }
    }
    
    /**
     * 触摸滑动支持
     */
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;
    
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        stopAutoPlay();
    }
    
    function handleTouchMove(e) {
        touchEndX = e.touches[0].clientX;
    }
    
    function handleTouchEnd() {
        const swipeDistance = touchStartX - touchEndX;
        
        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // 向左滑动 -> 下一页
                nextSlide();
            } else {
                // 向右滑动 -> 上一页
                prevSlide();
            }
        }
        
        startAutoPlay();
    }
    
    // ========================================
    // 事件绑定
    // ========================================
    
    // 箭头按钮点击
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoPlay();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoPlay();
        });
    }
    
    // 鼠标悬停暂停
    if (config.pauseOnHover) {
        const carousel = document.querySelector('.fbgroup-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', stopAutoPlay);
            carousel.addEventListener('mouseleave', startAutoPlay);
        }
    }
    
    // 触摸事件
    track.addEventListener('touchstart', handleTouchStart, { passive: true });
    track.addEventListener('touchmove', handleTouchMove, { passive: true });
    track.addEventListener('touchend', handleTouchEnd);
    
    // 窗口大小变化
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 200);
    });
    
    // 页面可见性变化（标签页切换时暂停）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });
    
    // ========================================
    // 初始化
    // ========================================
    createDots();
    updateCarousel(false);
    startAutoPlay();
    
    // 调试日志
    console.log('FB Group Carousel initialized:', {
        totalSlides,
        slidesPerView,
        totalPages
    });
}

/**
 * ========================================
 * TikTok KOL 轮播组件
 * 功能：自动轮播、手动切换、响应式适配
 * ========================================
 */
function initTkkolCarousel() {
    const track = document.getElementById('tkkolCarouselTrack');
    const dotsContainer = document.getElementById('tkkolCarouselDots');
    const prevBtn = document.querySelector('.tkkol-prev');
    const nextBtn = document.querySelector('.tkkol-next');
    
    // 如果轮播元素不存在，退出
    if (!track || !dotsContainer) return;
    
    const slides = track.querySelectorAll('.tkkol-slide');
    const totalSlides = slides.length;
    
    // 轮播配置
    const config = {
        autoPlayInterval: 6000,     // 自动轮播间隔（毫秒）- TikTok KOL 卡片信息较多，稍慢
        transitionDuration: 500,    // 过渡动画时长（毫秒）
        pauseOnHover: true,         // 鼠标悬停时暂停
        loop: true                  // 循环轮播
    };
    
    let currentIndex = 0;
    let autoPlayTimer = null;
    let slidesPerView = getSlidesPerView();
    let totalPages = Math.ceil(totalSlides / slidesPerView);
    
    /**
     * 根据屏幕宽度获取每次显示的幻灯片数量
     */
    function getSlidesPerView() {
        const width = window.innerWidth;
        if (width <= 992) return 1;      // 平板及以下：1个（卡片较大）
        return 2;                        // 桌面：2个
    }
    
    /**
     * 更新轮播位置
     */
    function updateCarousel(animate = true) {
        const slideWidth = 100 / slidesPerView;
        const offset = currentIndex * slideWidth;
        
        if (animate) {
            track.style.transition = `transform ${config.transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        } else {
            track.style.transition = 'none';
        }
        
        track.style.transform = `translateX(-${offset}%)`;
        
        // 更新指示点状态
        updateDots();
    }
    
    /**
     * 生成指示点
     */
    function createDots() {
        dotsContainer.innerHTML = '';
        totalPages = Math.ceil(totalSlides / slidesPerView);
        
        for (let i = 0; i < totalPages; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
            dot.setAttribute('aria-label', `跳转到第 ${i + 1} 页`);
            dot.dataset.index = i;
            
            dot.addEventListener('click', () => {
                goToPage(i);
                resetAutoPlay();
            });
            
            dotsContainer.appendChild(dot);
        }
    }
    
    /**
     * 更新指示点状态
     */
    function updateDots() {
        const dots = dotsContainer.querySelectorAll('.carousel-dot');
        const currentPage = Math.floor(currentIndex / slidesPerView);
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentPage);
        });
    }
    
    /**
     * 跳转到指定页
     */
    function goToPage(pageIndex) {
        currentIndex = pageIndex * slidesPerView;
        
        // 确保不超出范围
        const maxIndex = totalSlides - slidesPerView;
        if (currentIndex > maxIndex) {
            currentIndex = maxIndex;
        }
        if (currentIndex < 0) {
            currentIndex = 0;
        }
        
        updateCarousel();
    }
    
    /**
     * 下一页
     */
    function nextSlide() {
        currentIndex += slidesPerView;
        
        // 循环逻辑
        if (currentIndex >= totalSlides) {
            if (config.loop) {
                currentIndex = 0;
            } else {
                currentIndex = totalSlides - slidesPerView;
            }
        }
        
        updateCarousel();
    }
    
    /**
     * 上一页
     */
    function prevSlide() {
        currentIndex -= slidesPerView;
        
        // 循环逻辑
        if (currentIndex < 0) {
            if (config.loop) {
                // 跳转到最后一页
                const maxIndex = totalSlides - slidesPerView;
                currentIndex = Math.floor(maxIndex / slidesPerView) * slidesPerView;
            } else {
                currentIndex = 0;
            }
        }
        
        updateCarousel();
    }
    
    /**
     * 开始自动轮播
     */
    function startAutoPlay() {
        if (autoPlayTimer) return;
        
        autoPlayTimer = setInterval(() => {
            nextSlide();
        }, config.autoPlayInterval);
    }
    
    /**
     * 停止自动轮播
     */
    function stopAutoPlay() {
        if (autoPlayTimer) {
            clearInterval(autoPlayTimer);
            autoPlayTimer = null;
        }
    }
    
    /**
     * 重置自动轮播
     */
    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }
    
    /**
     * 处理窗口大小变化
     */
    function handleResize() {
        const newSlidesPerView = getSlidesPerView();
        
        if (newSlidesPerView !== slidesPerView) {
            slidesPerView = newSlidesPerView;
            currentIndex = 0;
            createDots();
            updateCarousel(false);
        }
    }
    
    /**
     * 触摸滑动支持
     */
    let touchStartX = 0;
    let touchEndX = 0;
    const minSwipeDistance = 50;
    
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        stopAutoPlay();
    }
    
    function handleTouchMove(e) {
        touchEndX = e.touches[0].clientX;
    }
    
    function handleTouchEnd() {
        const swipeDistance = touchStartX - touchEndX;
        
        if (Math.abs(swipeDistance) > minSwipeDistance) {
            if (swipeDistance > 0) {
                // 向左滑动 -> 下一页
                nextSlide();
            } else {
                // 向右滑动 -> 上一页
                prevSlide();
            }
        }
        
        startAutoPlay();
    }
    
    // ========================================
    // 事件绑定
    // ========================================
    
    // 箭头按钮点击
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetAutoPlay();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetAutoPlay();
        });
    }
    
    // 鼠标悬停暂停
    if (config.pauseOnHover) {
        const carousel = document.querySelector('.tkkol-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', stopAutoPlay);
            carousel.addEventListener('mouseleave', startAutoPlay);
        }
    }
    
    // 触摸事件
    track.addEventListener('touchstart', handleTouchStart, { passive: true });
    track.addEventListener('touchmove', handleTouchMove, { passive: true });
    track.addEventListener('touchend', handleTouchEnd);
    
    // 窗口大小变化
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleResize, 200);
    });
    
    // 页面可见性变化（标签页切换时暂停）
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    });
    
    // ========================================
    // 初始化
    // ========================================
    createDots();
    updateCarousel(false);
    startAutoPlay();
    
    // 调试日志
    console.log('TikTok KOL Carousel initialized:', {
        totalSlides,
        slidesPerView,
        totalPages
    });
}

/**
 * Tab Switcher Functionality
 */
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Remove active class from all buttons and panes
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            btn.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Track tab switch for analytics
            trackTabSwitch(targetTab);
            
            // Reinitialize icons in the new tab
            if (typeof lucide !== 'undefined') {
                setTimeout(() => {
                    lucide.createIcons();
                }, 100);
            }
        });
    });
}

/**
 * Analytics tracking for tab switches
 */
function trackTabSwitch(tabName) {
    // Google Analytics event (if available)
    if (typeof gtag !== 'undefined') {
        gtag('event', 'tab_switch', {
            'event_category': 'Resources',
            'event_label': tabName
        });
    }
    
    // Console log for debugging
    console.log('Tab switched to:', tabName);
}

/**
 * Animate numbers on scroll (for statistics)
 */
function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        
        // Format number with K/M suffix
        if (value >= 1000000) {
            element.textContent = (value / 1000000).toFixed(1) + 'M+';
        } else if (value >= 1000) {
            element.textContent = (value / 1000).toFixed(1) + 'K';
        } else {
            element.textContent = value;
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

/**
 * Intersection Observer for scroll animations
 */
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            
            // Animate statistics if present
            const stats = entry.target.querySelectorAll('[data-count]');
            stats.forEach(stat => {
                const target = parseInt(stat.dataset.count, 10);
                animateValue(stat, 0, target, 1500);
            });
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe resource cards
document.querySelectorAll('.resource-card').forEach(card => {
    observer.observe(card);
});

/**
 * Copy to clipboard functionality (for sharing)
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('链接已复制到剪贴板');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

/**
 * Toast notification (uses main.js toast if available)
 */
function showToast(message, type = 'success') {
    // Check if main.js toast exists
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    
    // Fallback toast implementation
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

/**
 * Handle URL hash for direct tab linking
 */
function handleUrlHash() {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['deals', 'kol', 'media'].includes(hash)) {
        const tabBtn = document.querySelector(`[data-tab="${hash}"]`);
        if (tabBtn) {
            tabBtn.click();
        }
    }
}

// Handle hash on page load
handleUrlHash();

// Handle hash changes
window.addEventListener('hashchange', handleUrlHash);

/**
 * Lazy load images (if any)
 */
function lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

lazyLoadImages();
