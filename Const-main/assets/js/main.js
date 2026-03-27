const DEFAULT_SITE_CONTENT = {
  settings: {
    company: {
      brandName: "GOLDENLAND",
      subtitle: "Construction & Real Estate Limited",
      gps: "GE-134-3488",
      location: "Ashongman Estates, Accra",
      email: "goldenlandconstructionltd@gmail.com",
      phone: "+233 (0) 24 347 5142",
      phoneRaw: "+233243475142",
      whatsapp: "233243475142",
      mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.4035!2d-0.1872!3d5.6245!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNcKwMzcnMjguMiJOIDDCsDExJzE0LjAiVw!5e0!3m2!1sen!2sgh!4v1620000000000!5m2!1sen!2sgh"
    },
    hero: {
      tagline: "ASHONGMAN ESTATES · ACCRA",
      titlePrefix: "We do not just build structures,",
      titleHighlight: "we build legacies",
      description: "Premium construction and real estate development with 12+ years of excellence across Ghana.",
      backgroundImage: "/assets/image/webaliser-_TPTXZd9mOo-unsplash.jpg",
      videoUrl: "",
      videoLabel: "Watch Showreel",
      stats: [
        { value: "150+", label: "Projects" },
        { value: "100%", label: "Delivery" },
        { value: "50+", label: "Staff" }
      ]
    },
    social: {
      facebook: "#",
      linkedin: "#",
      instagram: "#",
      whatsapp: "233243475142"
    }
  },
  services: [
    { icon: "fa-building", title: "General Construction", description: "Residential, commercial, and mixed-use construction delivered with strict quality control." },
    { icon: "fa-compass-drafting", title: "Architectural Planning", description: "Concept development, drawings, and design coordination for efficient project execution." },
    { icon: "fa-tools", title: "Renovation & Fit-Out", description: "Full interior and exterior upgrades for homes, offices, and hospitality spaces." },
    { icon: "fa-bolt", title: "MEP Services", description: "Mechanical, electrical, and plumbing solutions planned for long-term performance." }
  ],
  projects: [
    { category: "residential", title: "Luxury Heights", description: "12-storey luxury apartments with smart home integration", location: "Airport City, Accra", badge: "Completed 2025", imageUrl: "/assets/image/joel-filipe-RFDP7_80v5A-unsplash.jpg" },
    { category: "commercial", title: "Tema Industrial Park", description: "50,000 sqm warehouse and office complex", location: "Tema Free Zones", badge: "Ongoing", imageUrl: "/assets/image/park-lujiazui-financial-centre.jpg" },
    { category: "residential", title: "Ashongman Estate", description: "50 luxury homes with modern finishes", location: "Ashongman, Accra", badge: "2024", imageUrl: "/assets/image/michele-bitetto-84ZA1jFsfzM-unsplash.jpg" },
    { category: "infrastructure", title: "Room Decoration", description: "A full seven-bedroom interior finish and decoration project", location: "Kumasi, Ashanti", badge: "2023", imageUrl: "/assets/image/steven-ungermann-ydudT6TqqmI-unsplash.jpg" }
  ],
  testimonials: [
    { rating: 5, text: "GoldenLand delivered our 12-storey building ahead of schedule. Quality workmanship and a professional team.", author: "James Kofi", role: "CEO, JKL Holdings", avatarText: "JK", avatarColor: "#0b2b5c" },
    { rating: 5, text: "Their project management team made our industrial park development stress-free. Highly recommended.", author: "Abena Mensah", role: "Director, Tema Free Zones", avatarText: "AM", avatarColor: "#2a6eb0" },
    { rating: 5, text: "The MEP installation in our hospital wing was flawless. Professional from start to finish.", author: "Dr. Asare", role: "Medical Director", avatarText: "DA", avatarColor: "#1e4b6e" }
  ]
};

function cloneContent(value) {
  return JSON.parse(JSON.stringify(value));
}

const state = {
  content: cloneContent(DEFAULT_SITE_CONTENT),
  currentProjectFilter: "all",
  projectsVisibleCount: 6
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  return response.status === 204 ? null : response.json();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeIconClass(iconName) {
  return /^fa-[a-z0-9-]+$/i.test(iconName) ? iconName : "fa-briefcase";
}

function showToast(message, type = "info") {
  const root = document.getElementById("toastRoot");
  if (!root) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  root.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add("toast-hide");
    window.setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function hidePreloader() {
  const preloader = document.querySelector(".preloader");
  if (!preloader) {
    return;
  }

  preloader.style.opacity = "0";
  window.setTimeout(() => {
    preloader.style.display = "none";
  }, 400);
}

function buildWhatsAppLink(number) {
  const normalized = String(number || "").replace(/\D/g, "");
  const message = encodeURIComponent("Hello GoldenLand Construction, I am interested in your services.");
  return normalized ? `https://wa.me/${normalized}?text=${message}` : "#";
}

function mergeContent(payload) {
  return {
    settings: {
      company: { ...DEFAULT_SITE_CONTENT.settings.company, ...(payload?.settings?.company || {}) },
      hero: { ...DEFAULT_SITE_CONTENT.settings.hero, ...(payload?.settings?.hero || {}) },
      social: { ...DEFAULT_SITE_CONTENT.settings.social, ...(payload?.settings?.social || {}) }
    },
    services: Array.isArray(payload?.services) && payload.services.length ? payload.services : DEFAULT_SITE_CONTENT.services,
    projects: Array.isArray(payload?.projects) && payload.projects.length ? payload.projects : DEFAULT_SITE_CONTENT.projects,
    testimonials: Array.isArray(payload?.testimonials) && payload.testimonials.length ? payload.testimonials : DEFAULT_SITE_CONTENT.testimonials
  };
}

async function loadSiteContent() {
  try {
    const payload = await requestJson("/api/site-content");
    state.content = mergeContent(payload);
  } catch (error) {
    console.error("Failed to load site content:", error);
    state.content = cloneContent(DEFAULT_SITE_CONTENT);
    showToast("Loaded fallback site content because the API is unavailable.", "info");
  }
}

function renderHeroStats() {
  const container = document.getElementById("heroStats");
  const stats = state.content.settings.hero.stats || [];

  container.innerHTML = stats.map((item) => `
    <div class="stat-block">
      <span class="stat-num">${escapeHtml(item.value)}</span>
      <span class="stat-label">${escapeHtml(item.label)}</span>
    </div>
  `).join("");
}

function applySettings() {
  const { company, hero, social } = state.content.settings;
  document.getElementById("logoMain").textContent = company.brandName;
  document.getElementById("logoSub").textContent = company.subtitle;
  document.getElementById("footerBrand").textContent = company.brandName;
  document.getElementById("footerSubtitle").textContent = company.subtitle;
  document.getElementById("navGps").querySelector("span").textContent = company.gps;
  document.getElementById("heroGps").textContent = company.gps;
  document.getElementById("heroEmail").textContent = company.email;
  document.getElementById("heroPhone").textContent = company.phone;
  document.getElementById("contactGps").textContent = company.gps;
  document.getElementById("contactLocation").textContent = company.location;
  document.getElementById("contactEmail").textContent = company.email;
  document.getElementById("contactPhone").textContent = company.phone;
  document.getElementById("footerGps").textContent = company.gps;
  document.getElementById("footerLocation").textContent = company.location;
  document.getElementById("heroTagline").textContent = hero.tagline;
  document.getElementById("heroTitlePrefix").textContent = hero.titlePrefix;
  document.getElementById("heroTitleHighlight").textContent = hero.titleHighlight;
  document.getElementById("heroDescription").textContent = hero.description;
  document.getElementById("videoButtonLabel").textContent = hero.videoLabel || "Watch Showreel";
  document.getElementById("heroBackgroundImage").src = hero.backgroundImage;
  document.getElementById("contactMap").src = company.mapEmbedUrl;
  document.getElementById("footerCopyright").textContent = `© ${new Date().getFullYear()} ${company.brandName} ${company.subtitle}. All rights reserved.`;

  renderHeroStats();
  wireDynamicLinks(company, social);
}

function renderServices() {
  const container = document.getElementById("servicesContainer");
  const footerServiceLinks = document.getElementById("footerServiceLinks");

  container.innerHTML = state.content.services.map((service) => `
    <div class="service-card-modern">
      <div class="service-icon">
        <i class="fas ${safeIconClass(service.icon)}"></i>
      </div>
      <h3>${escapeHtml(service.title)}</h3>
      <p>${escapeHtml(service.description)}</p>
      <a href="#contact" class="service-link" data-track-click="service-inquiry" data-target="${escapeHtml(service.title)}">
        Inquire <i class="fas fa-arrow-right"></i>
      </a>
    </div>
  `).join("");

  footerServiceLinks.innerHTML = state.content.services.slice(0, 4).map((service) => `
    <li><a href="#services">${escapeHtml(service.title)}</a></li>
  `).join("");
}

function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  const filteredProjects = state.currentProjectFilter === "all"
    ? state.content.projects
    : state.content.projects.filter((project) => project.category === state.currentProjectFilter);

  const visibleProjects = filteredProjects.slice(0, state.projectsVisibleCount);
  grid.innerHTML = visibleProjects.map((project) => `
    <div class="project-item" data-category="${escapeHtml(project.category)}">
      <div class="project-img">
        <img src="${escapeHtml(project.imageUrl)}" alt="${escapeHtml(project.title)}">
        <div class="project-badge">${escapeHtml(project.badge)}</div>
      </div>
      <div class="project-info">
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description)}</p>
        <span class="project-location"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(project.location)}</span>
      </div>
    </div>
  `).join("");

  const loadMoreButton = document.getElementById("loadMoreProjects");
  loadMoreButton.style.display = visibleProjects.length < filteredProjects.length ? "inline-flex" : "none";
}

function renderTestimonials() {
  const slider = document.getElementById("testimonialsSlider");
  slider.innerHTML = state.content.testimonials.map((testimonial) => `
    <div class="testimonial-card">
      <div class="testimonial-rating">${"★".repeat(Number(testimonial.rating) || 5)}</div>
      <p class="testimonial-text">"${escapeHtml(testimonial.text)}"</p>
      <div class="testimonial-author">
        <div class="author-avatar" style="background: ${escapeHtml(testimonial.avatarColor || "#0b2b5c")}">${escapeHtml(testimonial.avatarText || "GL")}</div>
        <div>
          <h4>${escapeHtml(testimonial.author)}</h4>
          <span>${escapeHtml(testimonial.role)}</span>
        </div>
      </div>
    </div>
  `).join("");
}

function wireDynamicLinks(company, social) {
  document.querySelectorAll("[data-dynamic-link]").forEach((link) => {
    const key = link.dataset.dynamicLink;

    if (key === "email") {
      link.href = `mailto:${company.email}`;
    } else if (key === "phone") {
      link.href = `tel:${company.phoneRaw || company.phone}`;
    } else if (key === "whatsapp") {
      link.href = buildWhatsAppLink(social.whatsapp || company.whatsapp);
    } else {
      link.href = social[key] || "#";
    }
  });
}

function setupMobileMenu() {
  const toggle = document.getElementById("mobileToggle");
  const nav = document.getElementById("mainNav");

  toggle?.addEventListener("click", () => {
    toggle.classList.toggle("active");
    nav.classList.toggle("active");
  });
}

function setupSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const targetId = anchor.getAttribute("href");
      const target = targetId ? document.querySelector(targetId) : null;

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      document.getElementById("mobileToggle")?.classList.remove("active");
      document.getElementById("mainNav")?.classList.remove("active");
    });
  });
}

function setupProjectFilters() {
  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      state.currentProjectFilter = button.dataset.filter || "all";
      state.projectsVisibleCount = 6;
      renderProjects();
      trackClick(button.dataset.filter || "all", "project-filter");
    });
  });
}

function setupLoadMore() {
  const button = document.getElementById("loadMoreProjects");
  button?.addEventListener("click", () => {
    state.projectsVisibleCount += 6;
    renderProjects();
    trackClick("load-more-projects", "button");
  });
}

function setupGpsCopy() {
  document.querySelectorAll("[data-copy-gps]").forEach((element) => {
    element.style.cursor = "pointer";
    element.addEventListener("click", async (event) => {
      event.preventDefault();
      const gps = state.content.settings.company.gps;

      try {
        await navigator.clipboard.writeText(gps);
        showToast("GPS address copied.", "success");
        trackClick("gps", "copy");
      } catch (error) {
        console.error("Failed to copy GPS:", error);
        showToast("Unable to copy GPS address.", "error");
      }
    });
  });
}

async function submitContactForm(payload) {
  return requestJson("/api/contact-submissions", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

function setupForm() {
  const form = document.getElementById("contactForm");
  if (!form) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Sending...";

    try {
      const formData = new FormData(form);
      const payload = Object.fromEntries(formData.entries());
      await submitContactForm(payload);
      showToast("Message sent successfully. The admin can now reply from the dashboard.", "success");
      form.reset();
    } catch (error) {
      console.error("Contact form submission failed:", error);
      showToast("We could not send your message right now.", "error");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });
}

function setupVideoButton() {
  const button = document.getElementById("playVideo");
  if (!button) {
    return;
  }

  button.addEventListener("click", () => {
    const { videoUrl } = state.content.settings.hero;
    trackClick("hero-video", "video");

    if (videoUrl) {
      window.open(videoUrl, "_blank", "noopener,noreferrer");
    } else {
      showToast("Add a video URL from the admin dashboard to enable the showreel button.", "info");
    }
  });
}

function setupActiveNav() {
  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".main-nav a[href^='#']")];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      navLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${entry.target.id}`;
        link.classList.toggle("active", isActive);
      });
    });
  }, { threshold: 0.5 });

  sections.forEach((section) => observer.observe(section));
}

function setupGlobalClickTracking() {
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-track-click]");
    if (!target) {
      return;
    }

    trackClick(target.dataset.target || target.dataset.trackClick, target.dataset.trackClick);
  });
}

function setupLazyLoading() {
  document.querySelectorAll("img").forEach((image) => {
    image.loading = "lazy";
  });
}

function setupMapInteraction() {
  const map = document.getElementById("contactMap");
  map?.addEventListener("click", () => trackClick("embedded-map", "map"));
}

function sendBeaconJson(url, payload) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    return navigator.sendBeacon(url, blob);
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true
  }).catch(() => {});
  return true;
}

function trackPageView() {
  sendBeaconJson("/api/analytics/visit", {
    pagePath: window.location.pathname,
    referrer: document.referrer || "direct",
    title: document.title
  });
}

function trackClick(target, eventType) {
  sendBeaconJson("/api/analytics/click", {
    target,
    eventType,
    pagePath: window.location.pathname
  });
}

async function init() {
  await loadSiteContent();
  applySettings();
  renderServices();
  renderProjects();
  renderTestimonials();
  setupMobileMenu();
  setupSmoothScroll();
  setupProjectFilters();
  setupLoadMore();
  setupGpsCopy();
  setupForm();
  setupVideoButton();
  setupActiveNav();
  setupGlobalClickTracking();
  setupMapInteraction();
  setupLazyLoading();
  trackPageView();
  hidePreloader();
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error("Site initialization failed:", error);
    hidePreloader();
    showToast("The site loaded with limited functionality.", "error");
  });
});
