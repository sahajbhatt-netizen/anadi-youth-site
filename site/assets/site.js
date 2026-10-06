(() => {
  const SITE_BASE = "";
  const KNOWN_ROUTES = window.ANADI_ROUTES || [];

  const staticSiteRoot = () => {
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    const routes = [...KNOWN_ROUTES].sort((a, b) => b.length - a.length);
    for (const route of routes) {
      const suffix = route.replace(/\/+$/, "");
      if (pathname === suffix) return "";
      if (pathname.endsWith(suffix)) return pathname.slice(0, -suffix.length).replace(/\/+$/, "");
    }
    return pathname === "/" ? "" : pathname.replace(/\/[^/]*$/, "").replace(/\/+$/, "");
  };

  const staticUrlFor = (path) => {
    const root = staticSiteRoot();
    return window.location.origin + root + path + "/";
  };

  const normalizeRoute = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    return "/" + raw.replace(/^\/+|\/+$/g, "");
  };

  document.querySelectorAll("[data-destination]").forEach((a) => {
    const rawPath = a.getAttribute("data-destination") || "";
    const path = normalizeRoute(rawPath);
    let resolved = "";

    if (SITE_BASE && path) {
      resolved = SITE_BASE.replace(/\/$/, "") + path;
    } else if (path && KNOWN_ROUTES.includes(path)) {
      resolved = staticUrlFor(path);
    }

    if (resolved) {
      a.href = resolved;
      a.target = "_top";
      a.rel = "noopener";
      a.removeAttribute("aria-disabled");
    } else {
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("title", "This page is not published yet.");
      a.addEventListener("click", (event) => event.preventDefault());
    }
  });

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    const hash = a.getAttribute("href");
    if (!hash || hash === "#") return;
    a.removeAttribute("target");
    a.addEventListener("click", (event) => {
      const id = hash.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  const progressBar = document.getElementById("progressBar");
  const updateProgress = () => {
    if (!progressBar) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? (scrollY / max) * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + "%";
  };
  addEventListener("scroll", updateProgress, { passive: true });
  addEventListener("resize", updateProgress);
  updateProgress();

  const tocLinks = [...document.querySelectorAll(".toc a")];
  const sections = tocLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (!visible) return;
      tocLinks.forEach((a) => {
        a.classList.toggle("active", a.getAttribute("href") === "#" + visible.target.id);
      });
    }, { rootMargin: "-15% 0px -70% 0px", threshold: 0 });
    sections.forEach((section) => observer.observe(section));
  }
})();
