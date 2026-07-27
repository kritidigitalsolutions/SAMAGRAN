(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const navbar = document.querySelector(".sam-navbar");
  const scrollTopButton = document.querySelector(".scroll-top");
  const navLinks = document.querySelectorAll(".nav-link, .nav-app-links a, .mobile-links a");
  const sections = [...document.querySelectorAll("main section[id], footer[id]")];

  function updateChrome() {
    const scrolled = window.scrollY > 24;
    navbar?.classList.toggle("scrolled", scrolled);
    scrollTopButton?.classList.toggle("show", window.scrollY > 650);
  }

  function closeMobileNavOnClick() {
    const offcanvasEl = document.getElementById("mobileNav");
    if (!offcanvasEl || !window.bootstrap) return;
    const offcanvas = bootstrap.Offcanvas.getOrCreateInstance(offcanvasEl);
    document.querySelectorAll(".mobile-links a").forEach((link) => {
      link.addEventListener("click", () => offcanvas.hide());
    });
  }

  function setActiveNav() {
    const current = sections
      .filter((section) => window.scrollY >= section.offsetTop - 160)
      .pop();
    if (!current) return;
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${current.id}`);
    });
  }

  function initCounters() {
    const stats = document.querySelectorAll("[data-count]");
    if (!stats.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.count || 0);
        const duration = prefersReducedMotion ? 1 : 1500;
        const start = performance.now();

        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = `${Math.floor(eased * target).toLocaleString("en-IN")}+`;
          if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    }, { threshold: 0.45 });

    stats.forEach((stat) => observer.observe(stat));
  }

  function initSwipers() {
    if (!window.Swiper) return;

    new Swiper(".service-swiper", {
      slidesPerView: 1,
      spaceBetween: 18,
      pagination: { el: ".service-swiper .swiper-pagination", clickable: true },
      breakpoints: {
        576: { slidesPerView: 2 },
        992: { slidesPerView: 3 },
        1200: { slidesPerView: 4 }
      }
    });

    new Swiper(".samagri-swiper", {
      slidesPerView: 1.08,
      spaceBetween: 18,
      pagination: { el: ".samagri-swiper .swiper-pagination", clickable: true },
      autoplay: prefersReducedMotion ? false : { delay: 3600, disableOnInteraction: false },
      breakpoints: {
        576: { slidesPerView: 2 },
        992: { slidesPerView: 3 },
        1300: { slidesPerView: 4 }
      }
    });

    initScreenshotGallery();
  }

  function initScreenshotGallery() {
    const slideHost = document.getElementById("screenshotSlides");
    if (!slideHost || !window.Swiper) return;

    const galleries = {
      devotee: [
        { src: "img/samagran%20app.png", alt: "Samagran devotee app home screen" },
        { src: "img/pooja%20thali.jpg", alt: "Puja Samagri browsing preview" },
        { src: "img/pooja.jpg", alt: "Puja booking preview" },
        { src: "img/pandit.jpg", alt: "Online Puja preview" }
      ],
      pandit: [
        { src: "img/pujari%20app.png", alt: "Samagran Pandit app home screen" },
        { src: "img/pujari.jpg", alt: "Pandit profile preview" },
        { src: "img/pandit.jpg", alt: "Online Puja management preview" },
        { src: "img/kalas.jpg", alt: "Pandit service setup preview" }
      ]
    };

    let screenshotSwiper;

    function renderGallery(type) {
      slideHost.innerHTML = galleries[type].map((item) => `
        <div class="swiper-slide screenshot-card">
          <img src="${item.src}" alt="${item.alt}" loading="lazy">
        </div>
      `).join("");

      if (screenshotSwiper) screenshotSwiper.destroy(true, true);
      screenshotSwiper = new Swiper(".screenshot-swiper", {
        centeredSlides: true,
        slidesPerView: 1.1,
        spaceBetween: 18,
        loop: true,
        pagination: { el: ".screenshot-swiper .swiper-pagination", clickable: true },
        breakpoints: {
          576: { slidesPerView: 2 },
          992: { slidesPerView: 3 }
        }
      });
    }

    document.querySelectorAll(".tab-controls button").forEach((button) => {
      button.addEventListener("click", () => {
        document.querySelectorAll(".tab-controls button").forEach((tab) => tab.classList.remove("active"));
        button.classList.add("active");
        renderGallery(button.dataset.gallery);
      });
    });

    renderGallery("devotee");
  }

  function initGsap() {
    if (prefersReducedMotion || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.from(".hero-copy > *", {
      opacity: 0,
      y: 28,
      duration: 0.8,
      stagger: 0.12,
      ease: "power3.out"
    });

    gsap.from(".hero-visual", { opacity: 0, y: 30, duration: 1, ease: "power3.out", delay: 0.15 });
    gsap.to(".phone-main", { y: -16, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(".phone-alt", { y: 14, duration: 4.3, repeat: -1, yoyo: true, ease: "sine.inOut" });
    gsap.to(".petals span", {
      y: 34,
      x: 12,
      rotate: 28,
      duration: 5,
      repeat: -1,
      yoyo: true,
      stagger: 0.6,
      ease: "sine.inOut"
    });

    gsap.utils.toArray(".section-heading, .gita-quote, .app-showcase, .service-card, .samagri-pin, .step, .benefit-layout article").forEach((el) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 86%" },
        opacity: 0,
        y: 34,
        duration: 0.72,
        ease: "power2.out"
      });
    });

    gsap.utils.toArray(".reveal-img, .feature-image, .video-mock").forEach((el) => {
      gsap.from(el, {
        scrollTrigger: { trigger: el, start: "top 84%" },
        clipPath: "inset(0 0 100% 0)",
        duration: 0.9,
        ease: "power3.out"
      });
    });

    gsap.utils.toArray(".feature-image, .hero-photo").forEach((img) => {
      gsap.to(img, {
        scrollTrigger: { trigger: img, scrub: true },
        yPercent: -6,
        ease: "none"
      });
    });
  }

  window.addEventListener("scroll", () => {
    updateChrome();
    setActiveNav();
  }, { passive: true });

  scrollTopButton?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" }));
  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const id = link.getAttribute("href");
      if (!id || !id.startsWith("#")) return;
      const target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  function initPartnerForm() {
    const modalEl = document.getElementById("partnerModal");
    const form = document.getElementById("partnerForm");
    if (!modalEl || !form) return;

    const status = form.querySelector(".partner-status");
    const submitButton = form.querySelector('button[type="submit"]');
    const apiBaseUrl = window.SAMAGRAN_CONFIG?.API_BASE_URL || "https://samagran-backend.vercel.app";
    const partnerApiUrl = `${apiBaseUrl.replace(/\/$/, "")}/api/partner-with-us`;

    document.querySelectorAll("[data-partner-trigger]").forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const offcanvasEl = document.getElementById("mobileNav");
        if (offcanvasEl && window.bootstrap) {
          const offcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
          offcanvas?.hide();
        }
        if (window.bootstrap) bootstrap.Modal.getOrCreateInstance(modalEl).show();
      });
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      form.classList.add("was-validated");
      status.className = "partner-status";

      if (!form.checkValidity()) {
        status.textContent = "Please complete all required fields correctly.";
        status.classList.add("error");
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Sending...";
      status.textContent = "Submitting your request...";

      const data = new FormData(form);
      const payload = {
        name: String(data.get("name") || "").trim(),
        contactDetails: String(data.get("contactDetails") || "").trim(),
        email: String(data.get("email") || "").trim(),
        description: String(data.get("description") || "").trim()
      };

      try {
        if (window.location.protocol === "https:" && partnerApiUrl.startsWith("http://")) {
          throw new Error("MIXED_CONTENT_API_URL");
        }

        fetch(partnerApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).then((response) => {
          if (!response.ok) {
            throw new Error(`Partner API failed with ${response.status}`);
          }
        }).catch((error) => {
          console.error("Partner API background submit failed:", error);
        });

        status.textContent = "Success. Your partner request has been submitted.";
        status.classList.add("success");
        form.reset();
        form.classList.remove("was-validated");
        window.setTimeout(() => {
          submitButton.disabled = false;
          submitButton.textContent = "Send";
        }, 600);
      } catch (error) {
        const isMixedContent = error.message === "MIXED_CONTENT_API_URL";
        status.textContent = isMixedContent
          ? "Error. API must use HTTPS on the live website."
          : "Error. Partner API is not reachable right now.";
        status.classList.add("error");
        console.error(error);
        submitButton.disabled = false;
        submitButton.textContent = "Send";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    updateChrome();
    setActiveNav();
    closeMobileNavOnClick();
    initCounters();
    initSwipers();
    initGsap();
    initPartnerForm();
  });
})();

