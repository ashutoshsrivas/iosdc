/**
 * Renders the Highlights page from /sdp/api/public/highlights.
 *
 * Content is authored by admins in the SDP. Titles and captions are inserted as
 * TEXT, never HTML. Only `description` is injected as markup, and the server
 * has already sanitised it to a formatting-only allowlist on write.
 */
(function () {
  'use strict';

  var API = '/sdp/api/public';
  var root = document.getElementById('highlights-root');
  if (!root) return;

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    if (!value) return '';
    var d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function state(message) {
    root.innerHTML = '';
    root.appendChild(el('div', 'content-page__state', message));
  }

  function buildGallery(highlight) {
    var gallery = el('div', 'highlight__gallery');
    // A per-highlight group so fancybox pages through that event's photos only.
    var group = 'highlight-' + highlight.id;

    highlight.photos.forEach(function (photo) {
      var a = el('a', 'highlight__photo');
      a.href = photo.url;
      a.setAttribute('data-fancybox', group);
      if (photo.caption) a.setAttribute('data-caption', photo.caption);

      var img = document.createElement('img');
      img.src = photo.url;
      img.alt = photo.caption || highlight.title;
      img.loading = 'lazy';
      a.appendChild(img);
      gallery.appendChild(a);
    });
    return gallery;
  }

  function render(items) {
    if (!items.length) {
      state('No highlights have been published yet. Please check back soon.');
      return;
    }

    root.innerHTML = '';
    items.forEach(function (h) {
      var section = el('section', 'highlight');

      var date = formatDate(h.event_date);
      if (date) section.appendChild(el('div', 'highlight__date', date));

      section.appendChild(el('h2', 'highlight__title', h.title));

      if (h.description) {
        var body = el('div', 'highlight__body');
        // Sanitised server-side on write (see backend/src/sanitize.js).
        body.innerHTML = h.description;
        section.appendChild(body);
      }

      if (h.photos && h.photos.length) section.appendChild(buildGallery(h));

      root.appendChild(section);
    });

    // fancybox is already on the page via the theme bundle.
    if (window.jQuery && window.jQuery.fancybox) {
      window.jQuery('[data-fancybox]').fancybox({ buttons: ['zoom', 'close'] });
    }
  }

  fetch(API + '/highlights', { credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) throw new Error('Request failed');
      return r.json();
    })
    .then(render)
    .catch(function () {
      state('Highlights are unavailable right now. Please try again shortly.');
    });
})();
