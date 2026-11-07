// Section 1: the service index, and the small page behaviours.
const base = import.meta.env.BASE_URL;

export function initHero() {
  const nav = document.querySelector('#primary-nav');
  const menu = document.querySelector('.menu-toggle');
  const closeMenu = () => {
    nav.classList.remove('is-open');
    menu.setAttribute('aria-expanded', 'false');
  };
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menu.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // The prototype has no other pages yet, so these links stay put.
  document.querySelectorAll('[data-soon]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); closeMenu(); });
  });

  initPhotos();

  // Down into the tangle, rather than a jump to the top of the next section.
  document.querySelectorAll('[data-descend]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({ top: 1.45 * window.innerHeight, behavior: 'smooth' });
    });
  });
}

/** Pointing at a service brings its trade up behind the page. */
function initPhotos() {
  const list = document.getElementById('services');
  const photos = [...document.querySelectorAll('.hero-photo')];
  const rows = [...list.querySelectorAll('.svc')];

  // Touch has no hover, so a phone never needs the other four photographs.
  if (!window.matchMedia('(hover: hover)').matches) return;

  // Only the first photograph is needed for first paint.
  window.addEventListener('load', () => {
    photos.slice(1).forEach((p) => {
      p.style.backgroundImage = `url(${base}photos/${p.dataset.photo}.jpg)`;
    });
  }, { once: true });

  const select = (row) => {
    rows.forEach((r) => r.classList.toggle('is-on', r === row));
    photos.forEach((p) => p.classList.toggle('is-on', p.dataset.photo === row.dataset.photo));
  };
  list.addEventListener('pointerover', (e) => {
    const row = e.target.closest('.svc');
    if (row) select(row);
  });
  list.addEventListener('focusin', (e) => {
    const row = e.target.closest('.svc');
    if (row) select(row);
  });
}

/** Each service leads to its own proof further down the page. */
export function initServices(dashboard) {
  document.getElementById('services').addEventListener('click', (e) => {
    const row = e.target.closest('.svc');
    if (!row) return;
    e.preventDefault();
    const { view } = row.dataset;

    if (!view) {
      // The cabinet, settled and powered.
      window.scrollTo({ top: 3.4 * window.innerHeight, behavior: 'smooth' });
      return;
    }
    dashboard.setView(view);
    dashboard.reveal();

    // Keyboard users arrive where they were sent. The panel only accepts focus once it is up.
    const land = () => {
      if (dashboard.root.hasAttribute('inert')) {
        window.setTimeout(land, 120);
        return;
      }
      dashboard.root.querySelector('[data-view].is-active')?.focus({ preventScroll: true });
    };
    window.addEventListener('scrollend', land, { once: true });
  });
}
