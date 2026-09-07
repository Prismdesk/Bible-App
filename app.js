/* app.js — Bible PWA
 * Reads BIBLE_DATA (bible-data-template.js) and renders the Read, Favorites,
 * Notes and Settings views. Highlights, notes and favorites are persisted
 * in IndexedDB via db.js. Nothing here talks to a network.
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ *
   *  STATE
   * ------------------------------------------------------------------ */
  const state = {
    theme: 'system',
    versionId: null,
    testament: 'all',
    bookId: null,
    chapter: null,
    highlights: [],
    notes: [],
    favorites: [],
    currentView: 'read',
    editingNoteId: null,
    editorLink: null, // {versionId,bookId,chapter,startVerse,startOffset,endVerse,endOffset,quote}
    pendingSelection: null,
    quickMenuOpen: false
  };

  const HIGHLIGHT_COLORS = ['gold', 'green', 'blue', 'pink'];

  /* ------------------------------------------------------------------ *
   *  DOM REFS
   * ------------------------------------------------------------------ */
  const $ = (sel) => document.querySelector(sel);
  const els = {
    backButton: $('#backButton'),
    headerTitle: $('#headerTitle'),
    themeToggle: $('#themeToggle'),
    themeIconSun: $('#themeIconSun'),
    themeIconMoon: $('#themeIconMoon'),

    filterTestament: $('#filterTestament'),
    filterBook: $('#filterBook'),
    filterChapter: $('#filterChapter'),
    versionPills: $('#versionPills'),
    chapterHeading: $('#chapterHeading'),
    verseContainer: $('#verseContainer'),
    readEmptyState: $('#readEmptyState'),

    favoritesList: $('#favoritesList'),
    favoritesEmpty: $('#favoritesEmpty'),

    notesList: $('#notesList'),
    notesEmpty: $('#notesEmpty'),
    newNoteFab: $('#newNoteFab'),

    editorLinkChip: $('#editorLinkChip'),
    noteTitleInput: $('#noteTitleInput'),
    noteBody: $('#noteBody'),
    pinToggle: $('#pinToggle'),
    saveNoteBtn: $('#saveNoteBtn'),
    deleteNoteBtn: $('#deleteNoteBtn'),

    themeSegmented: $('#themeSegmented'),
    defaultVersionSelect: $('#defaultVersionSelect'),
    resetDataBtn: $('#resetDataBtn'),

    selectionToolbar: $('#selectionToolbar'),
    toolbarNoteBtn: $('#toolbarNoteBtn'),
    toolbarFavoriteBtn: $('#toolbarFavoriteBtn'),

    toast: $('#toast'),
    bottomNav: document.querySelector('.bottom-nav'),
    navButtons: Array.from(document.querySelectorAll('.nav-btn'))
  };

  /* ------------------------------------------------------------------ *
   *  UTILITIES
   * ------------------------------------------------------------------ */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('hidden');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.add('hidden'), 1800);
  }

  function findBook(bookId) {
    return BIBLE_DATA.books.find((b) => b.id === bookId);
  }
  function findChapter(bookId, chapterNumber) {
    const book = findBook(bookId);
    if (!book) return null;
    return book.chapters.find((c) => c.number === chapterNumber);
  }
  function booksForTestament(testament) {
    if (testament === 'all') return BIBLE_DATA.books;
    return BIBLE_DATA.books.filter((b) => b.testament === testament);
  }

  /* Parse {{fn:marker}} tokens out of raw verse text.
     Returns { plain, points:[{index,marker}] } where index is the
     character offset into `plain` right before which the marker sits. */
  function parseFootnoteTokens(raw) {
    const re = /\{\{fn:([^}]+)\}\}/g;
    let plain = '';
    const points = [];
    let lastIndex = 0;
    let m;
    while ((m = re.exec(raw))) {
      plain += raw.slice(lastIndex, m.index);
      points.push({ index: plain.length, marker: m[1] });
      lastIndex = re.lastIndex;
    }
    plain += raw.slice(lastIndex);
    return { plain, points };
  }

  /* Build the annotated HTML for one verse's plain text, given footnote
     insertion points and a list of highlight ranges {start,end,color,id}
     (already clipped to this verse, non-overlapping, sorted or not). */
  function annotateVerse(plain, points, ranges) {
    const events = [];
    ranges.forEach((r) => {
      if (r.end <= r.start) return;
      events.push({ pos: r.start, order: 0, type: 'hstart', r });
      events.push({ pos: r.end, order: 1, type: 'hend', r });
    });
    points.forEach((p) => events.push({ pos: p.index, order: 2, type: 'fn', marker: p.marker }));

    events.sort((a, b) => (a.pos - b.pos) || (a.order - b.order));

    let out = '';
    let cursor = 0;
    events.forEach((e) => {
      if (e.pos > cursor) {
        out += escapeHtml(plain.slice(cursor, e.pos));
        cursor = e.pos;
      }
      if (e.type === 'hstart') {
        out += `<mark class="hl hl-${e.r.color}" data-hl-id="${e.r.id}">`;
      } else if (e.type === 'hend') {
        out += `</mark>`;
      } else if (e.type === 'fn') {
        out += `<sup class="fn-marker" data-fn="${escapeHtml(e.marker)}">${escapeHtml(e.marker)}</sup>`;
      }
    });
    out += escapeHtml(plain.slice(cursor));
    return out;
  }

  /* Given a highlight record and a verse number + verse length, return the
     {start,end} range (in plain-text offsets) that highlight covers within
     that specific verse, or null if it doesn't touch this verse. */
  function rangeForVerse(hl, verseNumber, verseLength) {
    if (verseNumber < hl.startVerse || verseNumber > hl.endVerse) return null;
    const start = verseNumber === hl.startVerse ? hl.startOffset : 0;
    const end = verseNumber === hl.endVerse ? hl.endOffset : verseLength;
    return { start, end };
  }

  function highlightsFor(bookId, chapter, versionId) {
    return state.highlights.filter(
      (h) => h.bookId === bookId && h.chapter === chapter && h.versionId === versionId
    );
  }

  function refLabel(bookId, chapter, startVerse, endVerse) {
    const book = findBook(bookId);
    const name = book ? book.name : bookId;
    if (startVerse === endVerse) return `${name} ${chapter}:${startVerse}`;
    return `${name} ${chapter}:${startVerse}-${endVerse}`;
  }

  function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /* ------------------------------------------------------------------ *
   *  SETTINGS PERSISTENCE
   * ------------------------------------------------------------------ */
  async function loadSettings() {
    const rows = await BibleDB.getAll('settings');
    const map = {};
    rows.forEach((r) => (map[r.key] = r.value));
    state.theme = map.theme || 'system';
    state.versionId = map.versionId || (BIBLE_DATA.versions[0] && BIBLE_DATA.versions[0].id);
    state.testament = map.testament || 'all';
    state.bookId = map.bookId || (BIBLE_DATA.books[0] && BIBLE_DATA.books[0].id);
    state.chapter = map.chapter || (findBook(state.bookId) && findBook(state.bookId).chapters[0] && findBook(state.bookId).chapters[0].number);
  }
  async function saveSetting(key, value) {
    await BibleDB.put('settings', { key, value });
  }

  /* ------------------------------------------------------------------ *
   *  THEME
   * ------------------------------------------------------------------ */
  function applyTheme() {
    let effective = state.theme;
    if (effective === 'system') {
      effective = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', effective);
    els.themeIconSun.classList.toggle('hidden', effective === 'dark');
    els.themeIconMoon.classList.toggle('hidden', effective !== 'dark');
    document.querySelector('meta[name="theme-color"]').setAttribute(
      'content',
      effective === 'dark' ? '#0A1220' : '#1B2C4F'
    );
    Array.from(els.themeSegmented.children).forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.theme === state.theme);
    });
  }
  els.themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    state.theme = current === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveSetting('theme', state.theme);
  });
  els.themeSegmented.addEventListener('click', (e) => {
    const btn = e.target.closest('.segmented-btn');
    if (!btn) return;
    state.theme = btn.dataset.theme;
    applyTheme();
    saveSetting('theme', state.theme);
  });
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state.theme === 'system') applyTheme();
    });
  }

  /* ------------------------------------------------------------------ *
   *  VIEW SWITCHING
   * ------------------------------------------------------------------ */
  function showView(name) {
    state.currentView = name;
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    const map = { read: 'view-read', favorites: 'view-favorites', notes: 'view-notes', settings: 'view-settings', editor: 'view-editor' };
    document.getElementById(map[name]).classList.add('active');

    const isTopLevel = ['read', 'favorites', 'notes', 'settings'].includes(name);
    els.bottomNav.classList.toggle('hidden', !isTopLevel);
    els.backButton.classList.toggle('hidden', isTopLevel);
    hideSelectionToolbar();

    els.navButtons.forEach((b) => b.classList.toggle('active', b.dataset.view === name));

    const titles = { read: 'Bible', favorites: 'Favorites', notes: 'Notes', settings: 'Settings', editor: 'Note' };
    els.headerTitle.textContent = titles[name] || 'Bible';

    if (name === 'favorites') renderFavorites();
    if (name === 'notes') renderNotes();
  }
  els.navButtons.forEach((btn) => btn.addEventListener('click', () => showView(btn.dataset.view)));
  els.backButton.addEventListener('click', () => showView(state.currentView === 'editor' ? 'notes' : 'read'));

  /* ------------------------------------------------------------------ *
   *  READ VIEW — FILTERS
   * ------------------------------------------------------------------ */
  function populateTestamentFilter() {
    els.filterTestament.innerHTML = `
      <option value="all">Old &amp; New</option>
      <option value="old">Old Testament</option>
      <option value="new">New Testament</option>`;
    els.filterTestament.value = state.testament;
  }
  function populateBookFilter() {
    const books = booksForTestament(state.testament);
    els.filterBook.innerHTML = books.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
    if (!books.find((b) => b.id === state.bookId)) {
      state.bookId = books[0] ? books[0].id : null;
    }
    els.filterBook.value = state.bookId || '';
  }
  function populateChapterFilter() {
    const book = findBook(state.bookId);
    const chapters = book ? book.chapters : [];
    els.filterChapter.innerHTML = chapters.map((c) => `<option value="${c.number}">${c.number}</option>`).join('');
    if (!chapters.find((c) => c.number === state.chapter)) {
      state.chapter = chapters[0] ? chapters[0].number : null;
    }
    els.filterChapter.value = state.chapter != null ? String(state.chapter) : '';
  }
  function populateVersionPills() {
    els.versionPills.innerHTML = BIBLE_DATA.versions
      .map(
        (v) =>
          `<button class="version-pill${v.id === state.versionId ? ' selected' : ''}" data-version="${v.id}">${escapeHtml(v.abbreviation)}</button>`
      )
      .join('');
  }
  function populateDefaultVersionSelect() {
    els.defaultVersionSelect.innerHTML = BIBLE_DATA.versions
      .map((v) => `<option value="${v.id}">${escapeHtml(v.name)}</option>`)
      .join('');
    els.defaultVersionSelect.value = state.versionId;
  }

  els.filterTestament.addEventListener('change', () => {
    state.testament = els.filterTestament.value;
    saveSetting('testament', state.testament);
    populateBookFilter();
    populateChapterFilter();
    saveSetting('bookId', state.bookId);
    saveSetting('chapter', state.chapter);
    renderChapter();
  });
  els.filterBook.addEventListener('change', () => {
    state.bookId = els.filterBook.value;
    state.chapter = null;
    saveSetting('bookId', state.bookId);
    populateChapterFilter();
    saveSetting('chapter', state.chapter);
    renderChapter();
  });
  els.filterChapter.addEventListener('change', () => {
    state.chapter = parseInt(els.filterChapter.value, 10);
    saveSetting('chapter', state.chapter);
    renderChapter();
  });
  els.versionPills.addEventListener('click', (e) => {
    const btn = e.target.closest('.version-pill');
    if (!btn) return;
    state.versionId = btn.dataset.version;
    saveSetting('versionId', state.versionId);
    populateVersionPills();
    renderChapter();
  });
  els.defaultVersionSelect.addEventListener('change', () => {
    state.versionId = els.defaultVersionSelect.value;
    saveSetting('versionId', state.versionId);
    populateVersionPills();
    renderChapter();
  });

  /* ------------------------------------------------------------------ *
   *  READ VIEW — RENDER CHAPTER
   * ------------------------------------------------------------------ */
  function renderChapter() {
    const book = findBook(state.bookId);
    const chapter = findChapter(state.bookId, state.chapter);
    els.readEmptyState.classList.toggle('hidden', !!(book && chapter));

    if (!book || !chapter) {
      els.chapterHeading.textContent = '';
      els.verseContainer.innerHTML = '';
      return;
    }

    els.chapterHeading.textContent = `${book.name} ${chapter.number}`;

    const versionId = state.versionId;
    const relevantHighlights = highlightsFor(book.id, chapter.number, versionId);
    const footnoteEntries = [];
    let html = '';

    chapter.verses.forEach((verse) => {
      const section = (chapter.sections || []).find((s) => s.beforeVerse === verse.number);
      if (section) {
        html += `<span class="section-heading">${escapeHtml(section.title)}</span>`;
      }

      const raw = (verse.text && (verse.text[versionId] || Object.values(verse.text)[0])) || '';
      const { plain, points } = parseFootnoteTokens(raw);

      (verse.footnotes || []).forEach((fn) => {
        if (points.find((p) => p.marker === fn.marker)) {
          footnoteEntries.push({ marker: fn.marker, text: fn.text, verse: verse.number });
        }
      });

      const ranges = relevantHighlights
        .map((h) => {
          const r = rangeForVerse(h, verse.number, plain.length);
          return r ? { start: r.start, end: r.end, color: h.color, id: h.id } : null;
        })
        .filter(Boolean);

      const hasFullHighlight = relevantHighlights.some(
        (h) => h.type === 'verse' && h.startVerse === verse.number && h.endVerse === verse.number
      );
      const touchedByAny = ranges.length > 0;

      const innerHtml = annotateVerse(plain, points, ranges);

      html += `<span class="verse" data-verse="${verse.number}">` +
        `<sup class="verse-num${touchedByAny ? ' has-highlight' : ''}" data-verse="${verse.number}">${verse.number}</sup>` +
        `<span class="verse-text" data-verse="${verse.number}" data-plain-length="${plain.length}">${innerHtml}</span>` +
        ` </span>`;
    });

    els.verseContainer.innerHTML = html;

    if (footnoteEntries.length) {
      const box = document.createElement('div');
      box.className = 'footnotes-box';
      box.innerHTML = footnoteEntries
        .map((f) => `<div><b>${escapeHtml(f.marker)}</b> (v.${f.verse}) — ${escapeHtml(f.text)}</div>`)
        .join('');
      els.verseContainer.appendChild(box);
    }
  }

  /* ------------------------------------------------------------------ *
   *  VERSE NUMBER TAP — cycle highlight color for the whole verse
   * ------------------------------------------------------------------ */
  function findVerseHighlight(bookId, chapter, versionId, verseNumber) {
    return state.highlights.find(
      (h) =>
        h.bookId === bookId &&
        h.chapter === chapter &&
        h.versionId === versionId &&
        h.type === 'verse' &&
        h.startVerse === verseNumber &&
        h.endVerse === verseNumber
    );
  }

  async function cycleVerseHighlight(verseNumber) {
    const book = findBook(state.bookId);
    const chapterObj = findChapter(state.bookId, state.chapter);
    const verse = chapterObj.verses.find((v) => v.number === verseNumber);
    const raw = (verse.text && (verse.text[state.versionId] || Object.values(verse.text)[0])) || '';
    const { plain } = parseFootnoteTokens(raw);

    const existing = findVerseHighlight(book.id, state.chapter, state.versionId, verseNumber);

    if (!existing) {
      const hl = {
        id: bibleUUID(),
        type: 'verse',
        versionId: state.versionId,
        bookId: book.id,
        chapter: state.chapter,
        startVerse: verseNumber,
        endVerse: verseNumber,
        startOffset: 0,
        endOffset: plain.length,
        color: HIGHLIGHT_COLORS[0],
        text: plain,
        createdAt: Date.now()
      };
      state.highlights.push(hl);
      await BibleDB.put('highlights', hl);
    } else {
      const idx = HIGHLIGHT_COLORS.indexOf(existing.color);
      if (idx === HIGHLIGHT_COLORS.length - 1) {
        state.highlights = state.highlights.filter((h) => h.id !== existing.id);
        await BibleDB.delete('highlights', existing.id);
      } else {
        existing.color = HIGHLIGHT_COLORS[idx + 1];
        await BibleDB.put('highlights', existing);
      }
    }
    renderChapter();
  }

  els.verseContainer.addEventListener('click', (e) => {
    const numEl = e.target.closest('.verse-num');
    if (numEl) {
      cycleVerseHighlight(parseInt(numEl.dataset.verse, 10));
      return;
    }
    const fnEl = e.target.closest('.fn-marker');
    if (fnEl) {
      const box = els.verseContainer.querySelector('.footnotes-box');
      if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });

  /* ------------------------------------------------------------------ *
   *  PHRASE SELECTION — floating toolbar
   * ------------------------------------------------------------------ */
  function domOffsetWithin(root, node, offset) {
    let count = 0;
    let result = 0;
    let found = false;
    (function walk(n) {
      if (found) return;
      if (n.nodeType === Node.TEXT_NODE) {
        const inFootnote = n.parentElement && n.parentElement.closest('.fn-marker');
        if (inFootnote) {
          if (n === node) { result = count; found = true; }
          return;
        }
        if (n === node) { result = count + offset; found = true; return; }
        count += n.textContent.length;
      } else {
        for (let i = 0; i < n.childNodes.length; i++) {
          walk(n.childNodes[i]);
          if (found) return;
        }
      }
    })(root);
    return result;
  }

  function handleSelectionChange() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      // A collapsed selection is often just noise from a click on a mark or
      // verse number, which manage the toolbar themselves — don't fight them.
      if (!state.quickMenuOpen) hideSelectionToolbar();
      return;
    }
    // A real, non-empty selection always means the user is picking a fresh
    // phrase, even if a quick-menu happened to be open.
    state.quickMenuOpen = false;
    const range = sel.getRangeAt(0);
    const startVerseEl = range.startContainer.nodeType === Node.TEXT_NODE
      ? range.startContainer.parentElement.closest('.verse-text')
      : range.startContainer.closest && range.startContainer.closest('.verse-text');
    const endVerseEl = range.endContainer.nodeType === Node.TEXT_NODE
      ? range.endContainer.parentElement.closest('.verse-text')
      : range.endContainer.closest && range.endContainer.closest('.verse-text');

    if (!startVerseEl || !endVerseEl || !els.verseContainer.contains(startVerseEl)) {
      hideSelectionToolbar();
      return;
    }

    const startVerse = parseInt(startVerseEl.dataset.verse, 10);
    const endVerse = parseInt(endVerseEl.dataset.verse, 10);
    const startOffset = domOffsetWithin(startVerseEl, range.startContainer, range.startOffset);
    let endOffset = domOffsetWithin(endVerseEl, range.endContainer, range.endOffset);

    const text = sel.toString();
    if (!text.trim()) { hideSelectionToolbar(); return; }

    const lo = startVerse <= endVerse ? { verse: startVerse, offset: startOffset } : { verse: endVerse, offset: endOffset };
    const hi = startVerse <= endVerse ? { verse: endVerse, offset: endOffset } : { verse: startVerse, offset: startOffset };

    state.pendingSelection = {
      bookId: state.bookId,
      chapter: state.chapter,
      versionId: state.versionId,
      startVerse: lo.verse,
      startOffset: lo.offset,
      endVerse: hi.verse,
      endOffset: hi.offset,
      text,
      type: 'phrase'
    };

    showSelectionToolbar();
  }
  document.addEventListener('selectionchange', () => {
    if (state.currentView !== 'read') return;
    clearTimeout(handleSelectionChange._t);
    handleSelectionChange._t = setTimeout(handleSelectionChange, 120);
  });

  function showSelectionToolbar() {
    // Always anchor at a fixed, thumb-reachable spot above the bottom nav.
    // (Positioning it dynamically next to the selection is fragile across
    // scroll positions and viewport sizes, so we keep this simple.)
    const toolbar = els.selectionToolbar;
    toolbar.classList.remove('hidden');
    toolbar.style.top = 'auto';
    toolbar.style.bottom = 'calc(90px + var(--safe-bottom))';
  }
  function hideSelectionToolbar() {
    els.selectionToolbar.classList.add('hidden');
    state.pendingSelection = null;
    state.quickMenuOpen = false;
  }

  /* Dismiss the quick-menu when the user taps elsewhere on the page. Marks
     and verse numbers manage the toolbar themselves, so they're excluded
     here to avoid fighting with their own open/cycle logic. */
  document.addEventListener('click', (e) => {
    if (!state.quickMenuOpen) return;
    if (els.selectionToolbar.contains(e.target)) return;
    if (e.target.closest('mark.hl') || e.target.closest('.verse-num')) return;
    hideSelectionToolbar();
  });

  els.selectionToolbar.addEventListener('click', async (e) => {
    const swatch = e.target.closest('.swatch');
    if (swatch && state.pendingSelection) {
      await applyPhraseHighlight(state.pendingSelection, swatch.dataset.color);
      window.getSelection().removeAllRanges();
      hideSelectionToolbar();
    }
  });
  els.toolbarNoteBtn.addEventListener('click', () => {
    if (!state.pendingSelection) return;
    const sel = { ...state.pendingSelection };
    window.getSelection().removeAllRanges();
    hideSelectionToolbar();
    openEditorForNewNote(sel);
  });
  els.toolbarFavoriteBtn.addEventListener('click', async () => {
    if (!state.pendingSelection) return;
    await addFavorite({ ...state.pendingSelection });
    window.getSelection().removeAllRanges();
    hideSelectionToolbar();
    toast('Added to favorites');
  });

  /* Create a new highlight, or update/remove one already on the page
     (sel.existingId set) — the same floating toolbar drives both. */
  async function applyPhraseHighlight(sel, color) {
    if (sel.existingId) {
      if (color === 'none') {
        state.highlights = state.highlights.filter((h) => h.id !== sel.existingId);
        await BibleDB.delete('highlights', sel.existingId);
      } else {
        const hl = state.highlights.find((h) => h.id === sel.existingId);
        if (hl) { hl.color = color; await BibleDB.put('highlights', hl); }
      }
      renderChapter();
      return;
    }

    if (color === 'none') return;

    // prevent overlap with existing highlights in the same version/chapter
    const overlap = state.highlights.some((h) => {
      if (h.bookId !== sel.bookId || h.chapter !== sel.chapter || h.versionId !== sel.versionId) return false;
      return !(sel.endVerse < h.startVerse || sel.startVerse > h.endVerse) &&
        !(sel.startVerse === h.endVerse && sel.startOffset >= h.endOffset) &&
        !(sel.endVerse === h.startVerse && sel.endOffset <= h.startOffset);
    });
    if (overlap) {
      toast('That text overlaps an existing highlight');
      return;
    }
    const hl = {
      id: bibleUUID(),
      type: sel.type || 'phrase',
      versionId: sel.versionId,
      bookId: sel.bookId,
      chapter: sel.chapter,
      startVerse: sel.startVerse,
      startOffset: sel.startOffset,
      endVerse: sel.endVerse,
      endOffset: sel.endOffset,
      color,
      text: sel.text,
      createdAt: Date.now()
    };
    state.highlights.push(hl);
    await BibleDB.put('highlights', hl);
    renderChapter();
  }

  /* Tapping an existing highlighted mark lets you change its color or clear it */
  els.verseContainer.addEventListener('click', (e) => {
    const mark = e.target.closest('mark.hl');
    if (!mark) return;
    const id = mark.dataset.hlId;
    const hl = state.highlights.find((h) => h.id === id);
    if (!hl) return;
    openHighlightQuickMenu(hl);
  });

  function openHighlightQuickMenu(hl) {
    state.quickMenuOpen = true;
    state.pendingSelection = {
      bookId: hl.bookId, chapter: hl.chapter, versionId: hl.versionId,
      startVerse: hl.startVerse, startOffset: hl.startOffset,
      endVerse: hl.endVerse, endOffset: hl.endOffset, text: hl.text,
      type: hl.type, existingId: hl.id
    };
    showSelectionToolbar();
  }

  /* ------------------------------------------------------------------ *
   *  FAVORITES
   * ------------------------------------------------------------------ */
  async function addFavorite(entry) {
    const fav = {
      id: bibleUUID(),
      type: entry.type || 'verse',
      versionId: entry.versionId,
      bookId: entry.bookId,
      chapter: entry.chapter,
      startVerse: entry.startVerse,
      startOffset: entry.startOffset != null ? entry.startOffset : 0,
      endVerse: entry.endVerse != null ? entry.endVerse : entry.startVerse,
      endOffset: entry.endOffset != null ? entry.endOffset : (entry.text || '').length,
      text: entry.text,
      createdAt: Date.now()
    };
    state.favorites.unshift(fav);
    await BibleDB.put('favorites', fav);
  }

  function renderFavorites() {
    const list = [...state.favorites].sort((a, b) => b.createdAt - a.createdAt);
    els.favoritesEmpty.classList.toggle('hidden', list.length > 0);
    els.favoritesList.innerHTML = list
      .map(
        (f) => `
      <div class="card" data-id="${f.id}">
        <div class="card-ref"><span>${escapeHtml(refLabel(f.bookId, f.chapter, f.startVerse, f.endVerse))}</span><span>${formatDate(f.createdAt)}</span></div>
        <div class="card-text">${escapeHtml(f.text)}</div>
        <div class="card-actions">
          <button class="card-link-btn" data-action="goto">Go to verse</button>
          <button class="card-link-btn danger" data-action="remove">Remove</button>
        </div>
      </div>`
      )
      .join('');
  }
  els.favoritesList.addEventListener('click', async (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.id;
    const fav = state.favorites.find((f) => f.id === id);
    if (!fav) return;
    if (e.target.dataset.action === 'remove') {
      state.favorites = state.favorites.filter((f) => f.id !== id);
      await BibleDB.delete('favorites', id);
      renderFavorites();
    } else if (e.target.dataset.action === 'goto') {
      goToReference(fav.bookId, fav.chapter, fav.versionId);
    }
  });

  function goToReference(bookId, chapter, versionId) {
    const book = findBook(bookId);
    state.testament = book ? book.testament : 'all';
    state.bookId = bookId;
    state.chapter = chapter;
    if (versionId) state.versionId = versionId;
    saveSetting('testament', state.testament);
    saveSetting('bookId', state.bookId);
    saveSetting('chapter', state.chapter);
    saveSetting('versionId', state.versionId);
    populateTestamentFilter();
    populateBookFilter();
    populateChapterFilter();
    populateVersionPills();
    renderChapter();
    showView('read');
  }

  /* ------------------------------------------------------------------ *
   *  NOTES
   * ------------------------------------------------------------------ */
  function renderNotes() {
    const list = [...state.notes].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
    els.notesEmpty.classList.toggle('hidden', list.length > 0);
    els.notesList.innerHTML = list
      .map((n) => {
        const preview = n.bodyHtml.replace(/<[^>]+>/g, ' ').trim().slice(0, 160);
        const refBadge = n.link ? `<span class="ref-badge">${escapeHtml(refLabel(n.link.bookId, n.link.chapter, n.link.startVerse, n.link.endVerse))}</span>` : '';
        return `
        <div class="card note-card" data-id="${n.id}">
          ${n.pinned ? `<span class="pin-badge">📌</span>` : ''}
          <div class="note-title">${escapeHtml(n.title || 'Untitled note')}</div>
          <div class="note-preview">${escapeHtml(preview)}</div>
          <div class="note-meta">${refBadge}<span>${formatDate(n.createdAt)}</span></div>
        </div>`;
      })
      .join('');
  }
  els.notesList.addEventListener('click', (e) => {
    const card = e.target.closest('.note-card');
    if (!card) return;
    openEditorForExistingNote(card.dataset.id);
  });
  els.newNoteFab.addEventListener('click', () => openEditorForNewNote(null));

  function openEditorForNewNote(link) {
    state.editingNoteId = null;
    state.editorLink = link
      ? { ...link, quote: link.text }
      : null;
    els.noteTitleInput.value = '';
    els.noteBody.innerHTML = '';
    els.pinToggle.classList.remove('active');
    els.deleteNoteBtn.classList.add('hidden');
    renderEditorLinkChip();
    showView('editor');
    setTimeout(() => els.noteBody.focus(), 50);
  }
  function openEditorForExistingNote(id) {
    const note = state.notes.find((n) => n.id === id);
    if (!note) return;
    state.editingNoteId = id;
    state.editorLink = note.link || null;
    els.noteTitleInput.value = note.title || '';
    els.noteBody.innerHTML = note.bodyHtml || '';
    els.pinToggle.classList.toggle('active', !!note.pinned);
    els.deleteNoteBtn.classList.remove('hidden');
    renderEditorLinkChip();
    showView('editor');
  }
  function renderEditorLinkChip() {
    if (!state.editorLink) {
      els.editorLinkChip.classList.add('hidden');
      return;
    }
    const l = state.editorLink;
    els.editorLinkChip.classList.remove('hidden');
    els.editorLinkChip.innerHTML = `Linked to <b>${escapeHtml(refLabel(l.bookId, l.chapter, l.startVerse, l.endVerse))}</b> — "${escapeHtml((l.quote || '').slice(0, 90))}${(l.quote || '').length > 90 ? '…' : ''}"`;
  }

  els.pinToggle.addEventListener('click', () => els.pinToggle.classList.toggle('active'));

  document.querySelectorAll('.rte-btn[data-cmd]').forEach((btn) => {
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // keep selection
    btn.addEventListener('click', () => {
      document.execCommand(btn.dataset.cmd, false, btn.dataset.value || null);
      els.noteBody.focus();
    });
  });

  els.saveNoteBtn.addEventListener('click', async () => {
    const bodyHtml = els.noteBody.innerHTML.trim();
    const title = els.noteTitleInput.value.trim();
    if (!bodyHtml && !title) {
      toast('Write something before saving');
      return;
    }
    const now = Date.now();
    let note;
    if (state.editingNoteId) {
      note = state.notes.find((n) => n.id === state.editingNoteId);
      note.title = title;
      note.bodyHtml = bodyHtml;
      note.pinned = els.pinToggle.classList.contains('active');
      note.updatedAt = now;
      note.link = state.editorLink || note.link || null;
    } else {
      note = {
        id: bibleUUID(),
        title,
        bodyHtml,
        pinned: els.pinToggle.classList.contains('active'),
        link: state.editorLink || null,
        createdAt: now,
        updatedAt: now
      };
      state.notes.push(note);

      // If this note came from a text selection, also create a highlight
      // so the source text stays visibly marked when reading.
      if (state.editorLink && !state.editorLink.existingId) {
        const l = state.editorLink;
        const hl = {
          id: bibleUUID(),
          type: l.startVerse === l.endVerse && l.startOffset === 0 ? 'verse' : 'phrase',
          versionId: l.versionId, bookId: l.bookId, chapter: l.chapter,
          startVerse: l.startVerse, startOffset: l.startOffset,
          endVerse: l.endVerse, endOffset: l.endOffset,
          color: 'gold', text: l.quote, createdAt: now
        };
        const overlap = state.highlights.some((h) =>
          h.bookId === hl.bookId && h.chapter === hl.chapter && h.versionId === hl.versionId &&
          !(hl.endVerse < h.startVerse || hl.startVerse > h.endVerse)
        );
        if (!overlap) {
          state.highlights.push(hl);
          await BibleDB.put('highlights', hl);
        }
      }
    }
    await BibleDB.put('notes', note);
    toast('Note saved');
    showView('notes');
    renderChapter();
  });

  els.deleteNoteBtn.addEventListener('click', async () => {
    if (!state.editingNoteId) return;
    state.notes = state.notes.filter((n) => n.id !== state.editingNoteId);
    await BibleDB.delete('notes', state.editingNoteId);
    toast('Note deleted');
    showView('notes');
  });

  /* ------------------------------------------------------------------ *
   *  SETTINGS
   * ------------------------------------------------------------------ */
  els.resetDataBtn.addEventListener('click', async () => {
    if (!confirm('Erase all highlights, notes and favorites on this device? This cannot be undone.')) return;
    await Promise.all([BibleDB.clear('highlights'), BibleDB.clear('notes'), BibleDB.clear('favorites')]);
    state.highlights = [];
    state.notes = [];
    state.favorites = [];
    renderChapter();
    renderFavorites();
    renderNotes();
    toast('Data erased');
  });

  /* ------------------------------------------------------------------ *
   *  INIT
   * ------------------------------------------------------------------ */
  async function init() {
    await loadSettings();
    const [highlights, notes, favorites] = await Promise.all([
      BibleDB.getAll('highlights'),
      BibleDB.getAll('notes'),
      BibleDB.getAll('favorites')
    ]);
    state.highlights = highlights;
    state.notes = notes;
    state.favorites = favorites;

    applyTheme();
    populateTestamentFilter();
    populateBookFilter();
    populateChapterFilter();
    populateVersionPills();
    populateDefaultVersionSelect();
    renderChapter();
    showView('read');

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('service-worker.js').catch(() => {});
    }
  }

  init();
})();
