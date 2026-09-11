/* data-loader.js
 * Loads meta.js, then every <bookId>.js file listed in BIBLE_BOOK_ORDER
 * (in that exact order), then app.js. All files live at the repo root —
 * no subfolder — since browser-based uploads to GitHub/Netlify often
 * drop subfolder structure when files are selected individually instead
 * of dragging a whole folder.
 *
 * Each dynamically-created script gets `async = false`, which tells the
 * browser: download these in parallel, but always RUN them in the order
 * they were added — so BIBLE_DATA.books ends up in canonical Bible order
 * (needed for "next/previous book" navigation) and app.js only starts
 * once every book has finished loading. No changes to app.js were needed.
 */
(function () {
  'use strict';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  function showLoadError(err) {
    var el = document.getElementById('readEmptyState');
    if (el) {
      el.textContent = 'Could not load Bible data (' + err.message + '). Try refreshing.';
      el.classList.remove('hidden');
    }
    console.error(err);
  }

  loadScript('meta.js')
    .then(function () {
      var ids = window.BIBLE_BOOK_ORDER || [];
      var chain = Promise.resolve();
      ids.forEach(function (id) {
        chain = chain.then(function () {
          return loadScript(id + '.js');
        });
      });
      return chain;
    })
    .then(function () {
      return loadScript('app.js');
    })
    .catch(showLoadError);
})();
