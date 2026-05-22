(function () {
  const slugify = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64);

  const ensureUniqueId = (heading, seen) => {
    if (heading.id) {
      seen.add(heading.id);
      return heading.id;
    }
    const base = slugify(heading.textContent) || 'section';
    let id = base;
    let idx = 2;
    while (seen.has(id) || document.getElementById(id)) {
      id = `${base}-${idx}`;
      idx += 1;
    }
    heading.id = id;
    seen.add(id);
    return id;
  };

  const findHost = () =>
    document.querySelector('main .article') ||
    document.querySelector('main .full-inner') ||
    document.querySelector('main') ||
    document.querySelector('.container');

  const getHeadings = (host) =>
    Array.from(host.querySelectorAll('h2'))
      .filter((heading) => heading.textContent.trim().length > 0)
      .filter((heading) => !heading.closest('[hidden], [data-case-toc-exclude="true"]'))
      .slice(0, 12);

  const setActiveLink = (items, id) => {
    items.forEach(({ id: sectionId, link }) => {
      const isActive = sectionId === id;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const enableScrollSpy = (nav, headings) => {
    const items = Array.from(nav.querySelectorAll('.case-toc__link'))
      .map((link) => {
        const id = link.getAttribute('href')?.split('#')[1];
        const section = id ? document.getElementById(id) : null;
        return section ? { id, link, section } : null;
      })
      .filter(Boolean);

    if (!items.length || nav.dataset.scrollSpy === 'true') return;
    nav.dataset.scrollSpy = 'true';

    const updateActive = () => {
      const anchorLine = Math.min(220, Math.max(140, window.innerHeight * 0.24));
      let current = items[0];
      for (const item of items) {
        if (item.section.getBoundingClientRect().top <= anchorLine) {
          current = item;
        } else {
          break;
        }
      }
      setActiveLink(items, current.id);
    };

    items.forEach(({ id, link }) => {
      link.addEventListener('click', () => {
        setActiveLink(items, id);
        window.setTimeout(updateActive, 220);
      });
    });

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(updateActive, {
        root: null,
        threshold: [0, 0.1, 0.35, 0.65, 1],
        rootMargin: '-18% 0px -60% 0px',
      });
      headings.forEach((heading) => observer.observe(heading));
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    window.addEventListener('hashchange', () => {
      const id = window.location.hash.slice(1);
      if (items.some((item) => item.id === id)) setActiveLink(items, id);
      window.setTimeout(updateActive, 220);
    });
    updateActive();
  };

  const enhance = () => {
    if (!document.body.classList.contains('case-study-longform')) return;
    if (document.body.dataset.caseToc === 'false') return;

    const host = findHost();
    if (!host) return;

    const headings = getHeadings(host);
    if (headings.length < 2) return;

    const seen = new Set();
    let nav = document.querySelector('.case-toc');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'case-toc';
      nav.setAttribute('aria-label', 'In this document');
      nav.innerHTML = '<span class="case-toc__label">Jump to</span>';

      headings.forEach((heading) => {
        const id = ensureUniqueId(heading, seen);
        const link = document.createElement('a');
        link.className = 'case-toc__link';
        link.href = `#${id}`;
        link.textContent = heading.textContent.trim();
        nav.appendChild(link);
      });

      const summary = host.querySelector(':scope > .cs-summary') || document.querySelector('main > .cs-summary');
      const firstHeading = headings[0];
      if (summary && summary.parentElement === host) {
        summary.insertAdjacentElement('afterend', nav);
      } else {
        firstHeading.insertAdjacentElement('beforebegin', nav);
      }
    } else {
      headings.forEach((heading) => ensureUniqueId(heading, seen));
    }

    enableScrollSpy(nav, headings);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
})();
