(() => {
  // Published HTML already has valid, crawlable href attributes. Do NOT
  // rewrite them in the browser. Only the Google Docs preview may redirect
  // known content-page links into the Apps Script preview/published mirror.
  const docRoot = document.documentElement;
  const PUBLISHER_BASE = docRoot.getAttribute('data-anadi-publisher-base') || '';
  let PREVIEW_ROUTES = [];
  if (PUBLISHER_BASE) {
    try {
      PREVIEW_ROUTES = JSON.parse(docRoot.getAttribute('data-anadi-preview-routes') || '[]');
    } catch (e) { PREVIEW_ROUTES = []; }
  }
  if (PUBLISHER_BASE && PREVIEW_ROUTES.length) {
    document.querySelectorAll('[data-destination]').forEach((a) => {
      const path = a.getAttribute('data-destination') || '';
      if (!PREVIEW_ROUTES.includes(path) || !a.hasAttribute('href')) return;
      a.href = PUBLISHER_BASE + '?page=' + encodeURIComponent(path);
      a.removeAttribute('target');
      a.removeAttribute('rel');
    });
  }

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

  const siteHeader = document.getElementById("siteHeader");
  // The desktop More menu stays open for keyboard/touch use, but closes
  // when navigating elsewhere on the page or pressing Escape.
  const siteMoreMenu = document.getElementById("siteMoreMenu");
  if (siteMoreMenu) {
    document.addEventListener("click", (event) => {
      if (!siteMoreMenu.contains(event.target)) siteMoreMenu.open = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && siteMoreMenu.open) {
        siteMoreMenu.open = false;
        siteMoreMenu.querySelector("summary").focus();
      }
    });
  }
  // Desktop navigation also appears on landscape tablets. A main hub link
  // remains navigable for mouse users, but the first touch/pen tap expands its
  // submenu instead. A second tap navigates; "Overview" always navigates.
  const desktopHubMenus = [...document.querySelectorAll('[data-site-subnav]')];
  const setDesktopHubOpen = (menu, open) => {
    menu.classList.toggle('is-dropdown-open', open);
    const trigger = menu.querySelector('[data-site-subnav-trigger]');
    if (trigger) {
      trigger.setAttribute('aria-expanded', String(open));
      const title = menu.querySelector('[data-site-hub-link]')?.textContent || 'this section';
      trigger.setAttribute('aria-label', (open ? 'Hide' : 'Show') + ' ' + title.trim() + ' pages');
    }
  };
  const closeDesktopHubMenus = (except = null) => {
    desktopHubMenus.forEach((menu) => {
      if (menu !== except) setDesktopHubOpen(menu, false);
    });
  };
  desktopHubMenus.forEach((menu) => {
    const hubLink = menu.querySelector('[data-site-hub-link]');
    const trigger = menu.querySelector('[data-site-subnav-trigger]');
    if (!hubLink || !trigger) return;
    let lastPointerType = '';
    menu.addEventListener('pointerdown', (event) => { lastPointerType = event.pointerType || ''; });
    menu.addEventListener('keydown', () => { lastPointerType = 'keyboard'; });
    hubLink.addEventListener('click', (event) => {
      const touchLike = lastPointerType === 'touch' || lastPointerType === 'pen' ||
        (event.detail > 0 && matchMedia('(hover:none)').matches);
      if (touchLike && !menu.classList.contains('is-dropdown-open')) {
        event.preventDefault();
        closeDesktopHubMenus(menu);
        setDesktopHubOpen(menu, true);
        if (siteMoreMenu) siteMoreMenu.open = false;
      }
      lastPointerType = '';
    });
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const next = !menu.classList.contains('is-dropdown-open');
      closeDesktopHubMenus(menu);
      setDesktopHubOpen(menu, next);
      if (next && siteMoreMenu) siteMoreMenu.open = false;
    });
    // Focus can move into the dropdown without collapsing it.
    menu.addEventListener('focusout', (event) => {
      if (!menu.contains(event.relatedTarget)) setDesktopHubOpen(menu, false);
    });
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-site-subnav]')) closeDesktopHubMenus();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const opened = desktopHubMenus.find((menu) => menu.classList.contains('is-dropdown-open'));
    if (!opened) return;
    event.preventDefault();
    closeDesktopHubMenus();
    opened.querySelector('[data-site-subnav-trigger]')?.focus();
  });
  addEventListener('resize', () => { if (innerWidth <= 1040) closeDesktopHubMenus(); });

  const siteMenuToggle = document.getElementById("siteMenuToggle");
  const siteMobileNav = document.getElementById("siteMobileNav");
  if (siteHeader && siteMenuToggle && siteMobileNav) {
    const closeMenu = () => {
      siteHeader.classList.remove("is-menu-open");
      siteMenuToggle.setAttribute("aria-expanded", "false");
    };
    siteMenuToggle.addEventListener("click", () => {
      const willOpen = !siteHeader.classList.contains("is-menu-open");
      siteHeader.classList.toggle("is-menu-open", willOpen);
      siteMenuToggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
    siteMobileNav.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));
    addEventListener("resize", () => { if (innerWidth > 1040) closeMenu(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeMenu(); });
  }

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

  // Contextual TOC: H1 sections are always listed; only the current H1's
  // H2 subsections auto-expand. Manual toggles work independently on each
  // desktop/mobile TOC and can be overridden again by the visitor.
  const tocNavs = [...document.querySelectorAll('[data-toc-nav]')];
  if (tocNavs.length) {
    const contentSections = [...document.querySelectorAll('.content > .chapter[id]')];
    const sectionLinks = [...document.querySelectorAll('.toc__link[data-toc-id]')];
    const sectionToGroup = new Map();
    sectionLinks.forEach((link) => {
      if (!sectionToGroup.has(link.dataset.tocId)) {
        sectionToGroup.set(link.dataset.tocId, link.dataset.tocParent);
      }
    });

    const overrides = new WeakMap();
    tocNavs.forEach((nav) => {
      const overridesForNav = new Map();
      overrides.set(nav, overridesForNav);
      nav.querySelectorAll('.toc__group').forEach((group) => {
        const button = group.querySelector('[data-toc-toggle]');
        if (!button) return;
        button.addEventListener('click', () => {
          const children = group.querySelector('.toc__children');
          const currentlyOpen = Boolean(children && !children.hidden);
          overridesForNav.set(group.dataset.tocGroup, !currentlyOpen);
          updateTocState(activeTocId);
        });
      });
    });

    let activeTocId = contentSections[0]?.id || '';
    let activeGroupId = sectionToGroup.get(activeTocId) || '';
    function keepTocLinkVisible(nav, link) {
      if (!link || !nav || !nav.getClientRects().length) return;
      const mobileDetails = nav.closest('.mobile-toc details');
      if (mobileDetails && !mobileDetails.open) return;
      const bounds = nav.getBoundingClientRect();
      const entry = link.getBoundingClientRect();
      if (entry.top < bounds.top + 10) nav.scrollTop -= bounds.top + 10 - entry.top;
      else if (entry.bottom > bounds.bottom - 10) nav.scrollTop += entry.bottom - bounds.bottom + 10;
    }
    function updateTocState(nextId) {
      if (!nextId) return;
      const nextGroup = sectionToGroup.get(nextId) || '';
      // When the active H1 changes, its new subsections auto-open again, even
      // if that group was manually collapsed on a previous visit.
      if (nextGroup !== activeGroupId) {
        tocNavs.forEach((nav) => overrides.get(nav).delete(nextGroup));
        activeGroupId = nextGroup;
      }
      activeTocId = nextId;
      tocNavs.forEach((nav) => {
        nav.querySelectorAll('.toc__group').forEach((group) => {
          const groupId = group.dataset.tocGroup;
          const child = group.querySelector('.toc__children');
          const button = group.querySelector('[data-toc-toggle]');
          const choice = overrides.get(nav).get(groupId);
          const expanded = choice === undefined ? groupId === nextGroup : choice;
          group.classList.toggle('toc__group--active', groupId === nextGroup);
          if (child) child.hidden = !expanded;
          if (button) {
            button.setAttribute('aria-expanded', String(expanded));
            button.setAttribute('aria-label',
              (expanded ? 'Hide' : 'Show') + ' subsections of ' +
              (group.querySelector('.toc__major')?.textContent || 'this section'));
          }
        });
        nav.querySelectorAll('.toc__link[data-toc-id]').forEach((link) => {
          const active = link.dataset.tocId === nextId;
          link.classList.toggle('active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
        keepTocLinkVisible(nav, nav.querySelector('.toc__link.active'));
      });
    }

    function findCurrentSectionId() {
      if (!contentSections.length) return '';
      const headerHeight = document.getElementById('siteHeader')?.getBoundingClientRect().height || 0;
      const marker = headerHeight + Math.min(115, innerHeight * .17);
      let current = contentSections[0].id;
      for (const section of contentSections) {
        if (section.getBoundingClientRect().top > marker) break;
        current = section.id;
      }
      return current;
    }
    let tocTicking = false;
    function updateTocOnScroll() {
      if (tocTicking) return;
      tocTicking = true;
      requestAnimationFrame(() => {
        tocTicking = false;
        const id = findCurrentSectionId();
        if (id !== activeTocId) updateTocState(id);
      });
    }
    updateTocState(activeTocId);
    addEventListener('scroll', updateTocOnScroll, { passive:true });
    addEventListener('resize', updateTocOnScroll);
    // Keep mobile details in sync with any headings that changed while closed.
    document.querySelectorAll('.mobile-toc details').forEach((details) => {
      details.addEventListener('toggle', () => { if (details.open) updateTocState(activeTocId); });
    });
  }

})();
