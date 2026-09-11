/* meta.js
 * Bible versions + canonical book order.
 * Loaded first by data-loader.js; initializes the shared BIBLE_DATA object
 * that each <bookId>.js file then pushes its book into. */
window.BIBLE_DATA = {
  versions: [
    {
      "id": "web",
      "name": "World English Bible",
      "abbreviation": "WEB"
    },
    {
      "id": "kjv",
      "name": "King James Version",
      "abbreviation": "KJV"
    },
    {
      "id": "asv",
      "name": "American Standard Version",
      "abbreviation": "ASV"
    },
    {
      "id": "niv",
      "name": "New International Version",
      "abbreviation": "NIV"
    },
    {
      "id": "esv",
      "name": "English Standard Version",
      "abbreviation": "ESV"
    }
  ],
  books: []
};

/* Canonical book order — data-loader.js loads <id>.js for each
   id below, in this exact order, before starting the app. */
window.BIBLE_BOOK_ORDER = ["gen", "exo", "lev", "num", "deu", "jos", "jdg", "rut", "1sa", "2sa", "1ki", "2ki", "1ch", "2ch", "ezr", "neh", "est", "job", "psa", "pro", "ecc", "sng", "isa", "jer", "lam", "ezk", "dan", "hos", "jol", "amo", "oba", "jon", "mic", "nam", "hab", "zep", "hag", "zec", "mal", "mat", "mrk", "luk", "jhn", "act", "rom", "1co", "2co", "gal", "eph", "php", "col", "1th", "2th", "1ti", "2ti", "tit", "phm", "heb", "jas", "1pe", "2pe", "1jn", "2jn", "3jn", "jud", "rev"];
