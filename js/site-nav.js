/**
 * Site navigation for iosdc.geu.ac.in.
 *
 * The nav is authored by admins in the SDP, so it is fetched at runtime from
 * the public read-only API rather than hardcoded in each page:
 *   Home · Highlights · Cohorts (one sub-item per publicly visible cohort)
 *
 * Same-origin (/sdp/api/...), so there is no CORS involved.
 * If the API is unreachable the nav still renders with Home, so the site is
 * never left with an empty menu.
 */
(function () {
  'use strict';

  var API = '/sdp/api/public';

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // "cohort.html" from "/cohort.html?c=x" — used to mark the current item.
  function currentPage() {
    var path = window.location.pathname.split('/').pop();
    return path === '' ? 'index.html' : path;
  }

  function currentCohortSlug() {
    return new URLSearchParams(window.location.search).get('c');
  }

  function buildItem(label, href, isCurrent) {
    var li = el('li', 'navigation__item' + (isCurrent ? ' navigation__item--current' : ''));
    var a = el('a', 'navigation__link', label);
    // animsition-link drives the theme's page transition; skip it on the
    // current page so clicking it doesn't fade out to the same place.
    if (!isCurrent) {
      a.className += ' animsition-link';
      a.href = href;
    }
    li.appendChild(a);
    return li;
  }

  function buildCohorts(cohorts, page, slug) {
    var li = el('li', 'navigation__item navigation__item--has-sub' +
      (page === 'cohort.html' ? ' navigation__item--current' : ''));

    var parent = el('a', 'navigation__link', 'Cohorts');
    parent.setAttribute('role', 'button');
    parent.setAttribute('tabindex', '0');
    parent.setAttribute('aria-haspopup', 'true');
    parent.setAttribute('aria-expanded', 'false');

    // Hover opens it on a mouse; tap/Enter opens it on touch and keyboard.
    function toggle(e) {
      e.preventDefault();
      var open = li.classList.toggle('is-open');
      parent.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    parent.addEventListener('click', toggle);
    parent.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') toggle(e);
      if (e.key === 'Escape') {
        li.classList.remove('is-open');
        parent.setAttribute('aria-expanded', 'false');
      }
    });
    // A tap elsewhere closes it again.
    document.addEventListener('click', function (e) {
      if (!li.contains(e.target)) {
        li.classList.remove('is-open');
        parent.setAttribute('aria-expanded', 'false');
      }
    });

    li.appendChild(parent);

    var sub = el('ul', 'site-subnav');
    cohorts.forEach(function (c) {
      var subLi = el('li', 'site-subnav__item');
      var isCurrent = page === 'cohort.html' && slug === c.slug;
      var a = el('a', 'site-subnav__link' + (isCurrent ? ' is-current' : ''), c.name);
      if (!isCurrent) {
        a.className += ' animsition-link';
        a.href = 'cohort.html?c=' + encodeURIComponent(c.slug);
      }
      subLi.appendChild(a);
      sub.appendChild(subLi);
    });
    li.appendChild(sub);
    return li;
  }

  function render(nav) {
    var list = document.querySelector('.navigation__list');
    if (!list) return;

    var page = currentPage();
    var slug = currentCohortSlug();

    // The nav is always Home · Highlights · Cohorts. The cohort sub-items are
    // dynamic, but the three top-level links are fixed, so the menu doesn't
    // change shape depending on what happens to be published.
    list.innerHTML = '';
    list.appendChild(buildItem('Home', 'index.html', page === 'index.html'));
    list.appendChild(buildItem('Highlights', 'highlights.html', page === 'highlights.html'));

    var cohorts = (nav && nav.cohorts) || [];
    if (cohorts.length) {
      list.appendChild(buildCohorts(cohorts, page, slug));
    } else {
      // No visible cohorts yet — a plain link; cohort.html says so itself.
      list.appendChild(buildItem('Cohorts', 'cohort.html', page === 'cohort.html'));
    }

    // The hamburger is hidden at >=992px by default in this theme; the
    // --always modifier is the theme's own opt-in for showing it everywhere.
    var toggle = document.querySelector('.header__menu-toggle');
    if (toggle) toggle.classList.add('header__menu-toggle--always');
  }

  // Pages that ship with a hand-written nav in their markup. If the API is
  // down we leave that alone — losing real links would be worse than showing
  // a slightly stale menu. Only a page with an empty list gets the fallback.
  function fallback() {
    var list = document.querySelector('.navigation__list');
    if (!list) return;
    // Count links, not child nodes: index.html's list still holds an empty <li>
    // left over from its commented-out menu, which is not a usable nav.
    if (list.querySelectorAll('a').length > 0) return;

    list.innerHTML = '';
    var page = currentPage();
    [
      ['Home', 'index.html'],
      ['Highlights', 'highlights.html'],
      ['Cohorts', 'cohort.html'],
    ].forEach(function (item) {
      list.appendChild(buildItem(item[0], item[1], page === item[1]));
    });

    var toggle = document.querySelector('.header__menu-toggle');
    if (toggle) toggle.classList.add('header__menu-toggle--always');
  }

  function init() {
    fetch(API + '/nav', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (nav) {
        if (nav) render(nav);
        else fallback();
      })
      .catch(fallback);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
