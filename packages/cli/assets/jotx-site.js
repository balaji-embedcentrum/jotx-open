/*
 * jotx site - the small script every published page loads.
 * Tabs, menus, search and links between pages. The page works without it: every tab is
 * shown under its label and dropdowns open as plain disclosures.
 */
(function () {
  var script = document.currentScript
  var base = (script && script.getAttribute('data-base')) || '/'

  // ---- Tabs ----
  function setupTabs(root) {
    var bar = root.querySelector(':scope > .jx-s-tabs__bar')
    if (!bar) return
    var tabs = Array.prototype.slice.call(bar.querySelectorAll('.jx-s-tabs__tab'))
    var panels = Array.prototype.slice.call(root.querySelectorAll(':scope > .jx-s-tabs__panel'))
    var isPage = root.parentElement && root.parentElement.classList.contains('jx-page')
    var isNav = root.classList.contains('jx-s-tabs--nav')

    function open(index, focus, fromHash) {
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', String(i === index))
        tab.tabIndex = i === index ? 0 : -1
        panels[i].hidden = i !== index
      })
      if (focus) tabs[index].focus()
      if (isPage && !fromHash) {
        try { history.replaceState(null, '', '#' + tabs[index].getAttribute('data-tab')) } catch (e) { /* sandboxed */ }
      }
      if (isNav) {
        // A new page starts at its top, with the menu and dropdowns closed
        root.classList.remove('is-nav-open')
        root.querySelectorAll('.jx-s-tabs__more[open]').forEach(function (d) { d.open = false })
        if (!fromHash && root.getBoundingClientRect().top < 0) window.scrollTo(0, 0)
      }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { open(i) })
    })
    bar.addEventListener('keydown', function (e) {
      var current = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true' })
      var next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: tabs.length - 1 }[e.key]
      if (next === undefined) return
      e.preventDefault()
      open((next + tabs.length) % tabs.length, true)
    })

    // A link such as #tasks opens that tab; a link to a heading opens the tab holding it
    function fromHash() {
      var hash = decodeURIComponent(location.hash.slice(1))
      if (!hash) return
      var index = tabs.findIndex(function (t) { return t.getAttribute('data-tab') === hash })
      if (index < 0) {
        // A heading, or a tab inside one of these tabs (a sub-page)
        var target = document.getElementById(hash)
        index = panels.findIndex(function (p) {
          return (target && p.contains(target)) || p.querySelector('.jx-s-tabs__panel[data-tab="' + hash.replace(/"/g, '') + '"]')
        })
      }
      if (index >= 0) open(index, false, true)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    root.classList.add('is-ready')

    if (isNav) {
      var toggle = bar.querySelector('.jx-s-tabs__navtoggle')
      if (toggle) toggle.addEventListener('click', function () {
        toggle.setAttribute('aria-expanded', String(root.classList.toggle('is-nav-open')))
      })
      // When the pages do not fit beside the title and links, show a Menu button instead
      var pages = bar.querySelector('.jx-s-tabs__pages')
      // Too many pages: first drop icons (dense), then fold into a Menu button (compact)
      var fit = function () {
        root.classList.remove('is-compact', 'is-dense')
        if (bar.scrollWidth <= bar.clientWidth + 1) return
        root.classList.add('is-dense')
        if (bar.scrollWidth > bar.clientWidth + 1) { root.classList.remove('is-dense'); root.classList.add('is-compact') }
      }
      fit()
      window.addEventListener('resize', fit)
      if (pages) pages.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a[href^="#"]')) root.classList.remove('is-nav-open') })
    }
  }

  document.querySelectorAll('[data-jx-tabs]').forEach(setupTabs)

  // ---- Buttons that go back ----
  document.addEventListener('click', function (e) {
    var back = e.target.closest && e.target.closest('[data-jx-back]')
    if (back) { e.preventDefault(); history.back() }
  })

  // ---- Menus: one dropdown open at a time, closed by clicking elsewhere or Escape ----
  function closeMenus(except) {
    document.querySelectorAll('.jx-s-menu details[open]').forEach(function (d) { if (d !== except) d.open = false })
  }
  document.addEventListener('toggle', function (e) {
    if (e.target.matches && e.target.matches('.jx-s-menu details') && e.target.open) closeMenus(e.target)
  }, true)
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.jx-s-menu details')) closeMenus()
  })

  var header = document.querySelector('.jx-site-header')
  var navToggle = document.querySelector('.jx-site-navtoggle')
  if (header && navToggle) {
    navToggle.addEventListener('click', function () {
      var open = header.classList.toggle('is-nav-open')
      navToggle.setAttribute('aria-expanded', String(open))
    })
  }

  // ---- Search (Pagefind), loaded the first time it opens ----
  var dialog = document.querySelector('.jx-search')
  var loaded = false

  function openSearch() {
    if (!dialog) return
    dialog.classList.add('is-open')
    if (!loaded) {
      loaded = true
      var css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = base + 'pagefind/pagefind-ui.css'
      document.head.appendChild(css)
      var js = document.createElement('script')
      js.src = base + 'pagefind/pagefind-ui.js'
      js.onload = function () {
        /* global PagefindUI */
        new PagefindUI({ element: '#jx-search-ui', showSubResults: true, showImages: false, baseUrl: base, resetStyles: false, autofocus: true })
        var empty = dialog.querySelector('.jx-search__empty')
        if (empty) empty.remove()
      }
      js.onerror = function () {
        var empty = dialog.querySelector('.jx-search__empty')
        if (empty) empty.textContent = 'Search is available on the published site.'
      }
      document.head.appendChild(js)
    } else {
      var input = dialog.querySelector('input')
      if (input) input.focus()
    }
  }

  function closeSearch() { if (dialog) dialog.classList.remove('is-open') }

  document.querySelectorAll('[data-jx-search]').forEach(function (b) { b.addEventListener('click', openSearch) })
  if (dialog) dialog.addEventListener('click', function (e) { if (e.target === dialog) closeSearch() })
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable)
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openSearch() }
    if (e.key === 'Escape') { closeSearch(); closeMenus() }
  })

  // ---- Links inside live documents open the published page, not the raw .jot file ----
  document.addEventListener('jotx:navigate', function (e) {
    var url
    try { url = new URL(e.detail.url, location.href) } catch (err) { return }
    if (url.origin !== location.origin || url.pathname.indexOf(base) !== 0) return
    e.preventDefault()
    var rel = url.pathname.slice(base.length).replace(/(^|\/)index\.(jot|jotx|meet)$/, '$1').replace(/\.(jot|jotx|meet)$/, '/')
    location.assign(base + rel + url.hash)
  })
})()
