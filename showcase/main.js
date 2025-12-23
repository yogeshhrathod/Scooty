document.addEventListener('DOMContentLoaded', () => {
    // Analytics Initialization handled in index.html

    // Site Loader Logic
    const loader = document.getElementById('loader');
    if (loader) {
        document.body.style.overflow = 'hidden'; // Lock scrolling

        window.addEventListener('load', () => {
            setTimeout(() => {
                loader.classList.add('fade-out');
                document.body.style.overflow = ''; // Unlock scrolling
            }, 1500); // 1.5s minimum to ensure the wheelie is seen
        });

        // Safety fallback: auto-reveal after 10s if images take too long
        setTimeout(() => {
            if (!loader.classList.contains('fade-out')) {
                loader.classList.add('fade-out');
                document.body.style.overflow = '';
            }
        }, 10000);
    }

    // Custom Cursor
    const cursor = document.createElement('div');
    const trail = document.createElement('div');
    cursor.className = 'cursor-follower';
    trail.className = 'cursor-trail';
    cursor.style.display = 'none'; // Hide initially
    trail.style.display = 'none';
    document.body.appendChild(cursor);
    document.body.appendChild(trail);

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (!isTouchDevice) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.display = 'block';
            trail.style.display = 'block';
            const x = e.clientX;
            const y = e.clientY;
            cursor.style.transform = `translate3d(${x - 6}px, ${y - 6}px, 0)`;
            trail.style.transform = `translate3d(${x - 15}px, ${y - 15}px, 0)`;
        });
    }

    // Parallax Effect
    document.addEventListener('mousemove', (e) => {
        const x = (window.innerWidth / 2 - e.clientX) / 25;
        const y = (window.innerHeight / 2 - e.clientY) / 25;
        const parallaxImg = document.querySelector('.parallax-img');
        if (parallaxImg) {
            parallaxImg.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.1)`;
        }
    });

    // Intersection Observer for Action Reveals
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) skew(0)';
                if (entry.target.classList.contains('hero-title')) {
                    entry.target.classList.add('animate-glitch');
                }
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.showcase-step, .hero-title, .hero-subtitle, .story-step').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(50px) skew(-10deg)';
        el.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        observer.observe(el);
    });

    // Scroll Showcase Observer
    const showcaseObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const step = entry.target;
                const targetId = step.getAttribute('data-target');

                // Activate text step
                document.querySelectorAll('.showcase-step').forEach(s => s.classList.remove('active'));
                step.classList.add('active');

                // Swap images
                document.querySelectorAll('.showcase-img').forEach(img => img.classList.remove('active'));
                document.getElementById(`showcase-img-${targetId}`).classList.add('active');
            }
        });
    }, {
        threshold: 0.6,
        rootMargin: '-10% 0px -10% 0px'
    });

    document.querySelectorAll('.showcase-step').forEach(step => {
        showcaseObserver.observe(step);
    });

    // Mouse interaction for cards (Dynamic tilting)
    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
    });
});
