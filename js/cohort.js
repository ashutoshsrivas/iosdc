/**
 * Renders a cohort's public page from /sdp/api/public/cohorts/:slug.
 *
 * URL: cohort.html?c=<slug>. With no slug, the first visible cohort is used so
 * a bare /cohort.html still shows something.
 *
 * "Know more" opens the app's custom modal HTML when the admin supplied one,
 * otherwise its description. Both were sanitised server-side on write; titles
 * and link text are inserted as TEXT.
 */
(function () {
  'use strict';

  var API = '/sdp/api/public';
  var root = document.getElementById('cohort-root');
  var titleEl = document.getElementById('cohort-title');
  var taglineEl = document.getElementById('cohort-tagline');
  if (!root) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function state(message) {
    root.innerHTML = '';
    root.appendChild(el('div', 'content-page__state', message));
  }

  function openModal(app) {
    var wrapper = el('div', 'app-modal');
    wrapper.appendChild(el('h2', null, app.title));

    var content = el('div', 'app-modal__content');
    // modal_html wins over description when the admin authored one.
    content.innerHTML = app.modal_html || app.description || '';
    wrapper.appendChild(content);

    if (window.jQuery && window.jQuery.fancybox) {
      window.jQuery.fancybox.open({
        src: wrapper,
        type: 'inline',
        opts: { touch: false },
      });
    } else if (app.link_url) {
      // Without fancybox, fall back to the app's own link rather than nothing.
      window.open(app.link_url, '_blank', 'noopener');
    }
  }

  function buildCard(app) {
    var card = el('article', 'app-card');

    if (app.hero_image_url) {
      var hero = el('div', 'app-card__hero');
      var img = document.createElement('img');
      img.src = app.hero_image_url;
      img.alt = app.title;
      img.loading = 'lazy';
      hero.appendChild(img);
      card.appendChild(hero);
    }

    var body = el('div', 'app-card__body');
    body.appendChild(el('h2', 'app-card__title', app.title));

    if (app.description) {
      var desc = el('div', 'app-card__desc');
      desc.innerHTML = app.description; // sanitised server-side
      body.appendChild(desc);
    }

    var actions = el('div', 'app-card__actions');

    if (app.link_url) {
      var link = el('a', 'app-card__link', 'View app');
      link.href = app.link_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      actions.appendChild(link);
    }

    // Only offer "Know more" when there is actually more to show.
    if (app.modal_html || app.description) {
      var more = el('button', 'app-card__link', 'Know more');
      more.type = 'button';
      more.addEventListener('click', function () { openModal(app); });
      actions.appendChild(more);
    }

    if (actions.childNodes.length) body.appendChild(actions);
    card.appendChild(body);
    return card;
  }

  function render(cohort) {
    if (titleEl) titleEl.textContent = cohort.name;
    if (taglineEl && cohort.tagline) taglineEl.textContent = cohort.tagline;
    document.title = cohort.name + ' | iOS Development Centre, Graphic Era University';

    if (!cohort.apps || !cohort.apps.length) {
      state('No apps have been published for this cohort yet.');
      return;
    }

    root.innerHTML = '';
    var grid = el('div', 'app-grid');
    cohort.apps.forEach(function (app) { grid.appendChild(buildCard(app)); });
    root.appendChild(grid);
  }

  function load(slug) {
    return fetch(API + '/cohorts/' + encodeURIComponent(slug), { credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(render);
  }

  var slug = new URLSearchParams(window.location.search).get('c');

  if (slug) {
    load(slug).catch(function () {
      state('That cohort could not be found.');
    });
  } else {
    // No slug — fall back to the first visible cohort.
    fetch(API + '/cohorts', { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (list) {
        if (!list.length) {
          state('No cohorts have been published yet.');
          return;
        }
        return load(list[0].slug);
      })
      .catch(function () {
        state('Cohorts are unavailable right now. Please try again shortly.');
      });
  }
})();
