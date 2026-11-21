/* =========================================================
   Morgan Automation: small enhancements, no libraries.
   1 Settings + confetti · 2 Accordion · 3 Carousel + drag cursor ·
   4 Contact form · 5 Scroll progress
   Everything works without this file: all content is visible,
   accordion panels are open and the form posts straight to Web3Forms.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- 1. Settings ---------- */
  var EMAIL = 'perseus@morganautomations.com';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  // Translate a runtime string if a language is active (i18n.js), else English
  function t(en) { return window.maI18n ? window.maI18n.t(en) : en; }

  /* Small confetti burst from an element. Palette colours only.
     direction: 1 = shoots downward (from the header), -1 = upward (from a button).
     Skipped entirely for reduced motion. */
  var CONFETTI_COLORS = ['--red', '--coral', '--lilac', '--ink'];
  var CONFETTI_PIECES = 26;
  function confetti(origin, direction) {
    if (reduceMotion || !origin || !document.body.animate) return;
    var r = origin.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var css = getComputedStyle(document.documentElement);
    var layer = document.createElement('div');
    layer.className = 'confetti';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
    for (var i = 0; i < CONFETTI_PIECES; i++) {
      var piece = document.createElement('span');
      var w = 5 + Math.random() * 4;
      piece.style.left = x + 'px';
      piece.style.top = y + 'px';
      piece.style.width = w + 'px';
      piece.style.height = (Math.random() < 0.5 ? w : w * 0.45) + 'px';
      piece.style.background = css.getPropertyValue(CONFETTI_COLORS[i % CONFETTI_COLORS.length]).trim();
      if (Math.random() < 0.3) piece.style.borderRadius = '50%';
      layer.appendChild(piece);
      // Fan out in a half circle, then drift down with gravity and fade
      var angle = Math.random() * Math.PI * direction;
      var dist = 45 + Math.random() * 75;
      var dx = Math.cos(angle) * dist;
      var dy = Math.sin(angle) * dist;
      var spin = (Math.random() * 2 - 1) * 540;
      piece.animate([
        { transform: 'translate(-50%,-50%) translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) rotate(' + spin * 0.6 + 'deg)', opacity: 1, offset: 0.55 },
        { transform: 'translate(-50%,-50%) translate(' + dx * 1.15 + 'px,' + (dy + 60) + 'px) rotate(' + spin + 'deg)', opacity: 0 }
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.75,.35,1)', fill: 'forwards' });
    }
    setTimeout(function () { layer.remove(); }, 1600);
  }

  /* ---------- 2. Services accordion ----------
     Click or keyboard. One panel open at a time; clicking the open one closes it. */
  document.querySelectorAll('[data-accordion]').forEach(function (acc) {
    var items = Array.prototype.slice.call(acc.querySelectorAll('.acc-item'));
    items.forEach(function (item) {
      var btn = item.querySelector('.acc-btn');
      btn.addEventListener('click', function () {
        var willOpen = !item.classList.contains('is-open');
        items.forEach(function (other) {
          var open = other === item && willOpen;
          other.classList.toggle('is-open', open);
          other.querySelector('.acc-btn').setAttribute('aria-expanded', String(open));
        });
      });
    });
  });

  /* ---------- 3. Draggable carousel + custom "Drag" cursor ----------
     Touch uses native swipe scrolling; mouse drags are handled here. */
  document.querySelectorAll('[data-carousel]').forEach(function (carousel) {
    var section = carousel.closest('section');
    var cursor = section && section.querySelector('.drag-cursor');
    var prev = section && section.querySelector('[data-carousel-prev]');
    var next = section && section.querySelector('[data-carousel-next]');
    var startX = 0, startScroll = 0, dragging = false, moved = false;
    var behavior = reduceMotion ? 'auto' : 'smooth';

    function step() {
      var card = carousel.querySelector('.card');
      if (!card) return 0;
      var gap = parseFloat(getComputedStyle(card.parentNode).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }
    if (prev) prev.addEventListener('click', function () { carousel.scrollBy({ left: -step(), behavior: behavior }); });
    if (next) next.addEventListener('click', function () { carousel.scrollBy({ left: step(), behavior: behavior }); });

    carousel.addEventListener('pointerdown', function (e) {
      // Reset on every press, so an earlier drag can't swallow the next click
      moved = false;
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      // Presses on links/buttons inside a card are clicks, not drags
      if (e.target.closest('a, button')) return;
      dragging = true;
      startX = e.clientX;
      startScroll = carousel.scrollLeft;
      carousel.classList.add('is-dragging');
      carousel.setPointerCapture(e.pointerId);
    });
    carousel.addEventListener('pointermove', function (e) {
      if (cursor) {
        cursor.style.setProperty('--x', e.clientX + 'px');
        cursor.style.setProperty('--y', e.clientY + 'px');
        // Hide the "Drag" label over links/buttons so the normal pointer shows
        cursor.classList.toggle('is-hidden', !dragging && !!e.target.closest('a, button'));
      }
      if (!dragging) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      carousel.scrollLeft = startScroll - dx;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      carousel.classList.remove('is-dragging');
      var s = step();
      if (s) carousel.scrollTo({ left: Math.round(carousel.scrollLeft / s) * s, behavior: behavior });
    }
    carousel.addEventListener('pointerup', endDrag);
    carousel.addEventListener('pointercancel', endDrag);
    carousel.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    carousel.addEventListener('dragstart', function (e) { e.preventDefault(); });

    if (cursor) {
      // Last known mouse position. Scrolling with the wheel doesn't move the
      // mouse, so pointerleave never fires; re-check against this on scroll.
      var lastX = -1, lastY = -1;

      function syncCursor() {
        if (!finePointer.matches || lastX < 0) { cursor.classList.remove('is-active'); return; }
        var r = carousel.getBoundingClientRect();
        var inside = lastX >= r.left && lastX <= r.right && lastY >= r.top && lastY <= r.bottom;
        cursor.classList.toggle('is-active', inside || dragging);
        if (inside && !dragging) {
          var el = document.elementFromPoint(lastX, lastY);
          cursor.classList.toggle('is-hidden', !!(el && el.closest('a, button')));
        }
      }

      document.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse') return;
        lastX = e.clientX;
        lastY = e.clientY;
      }, { passive: true });

      carousel.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse' || !finePointer.matches) return;
        lastX = e.clientX;
        lastY = e.clientY;
        cursor.style.setProperty('--x', e.clientX + 'px');
        cursor.style.setProperty('--y', e.clientY + 'px');
        cursor.classList.add('is-active');
      });
      carousel.addEventListener('pointerleave', function () { if (!dragging) cursor.classList.remove('is-active'); });
      window.addEventListener('scroll', syncCursor, { passive: true });
      document.addEventListener('mouseleave', function () { lastX = lastY = -1; cursor.classList.remove('is-active'); });
    }
  });

  /* ---------- 4. Contact form (Web3Forms) ----------
     Posts the form as JSON to Web3Forms, which emails it to EMAIL.
     The visitor stays on the page and sees a thank-you or an error with the
     email address. Without JS the form posts normally (see index.html). */
  var EMPTY_MESSAGE = 'You have to write something...';
  var MSG_SENDING = 'Sending...';
  var MSG_OK = "Thanks, I'll reply within one working day";
  var MSG_ERROR = "Sorry, your note couldn't be sent. Please email me at {email}.";
  var SEND_TIMEOUT_MS = 15000;
  document.querySelectorAll('[data-contact-form]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    var submit = form.querySelector('[type="submit"]');
    var sending = false;

    // Replace the browser's "Please fill out this field." for empty required fields
    form.querySelectorAll('input, textarea').forEach(function (field) {
      field.addEventListener('invalid', function () {
        field.setCustomValidity(field.validity.valueMissing ? t(EMPTY_MESSAGE) : '');
      });
      field.addEventListener('input', function () { field.setCustomValidity(''); });
    });

    // Validate in JS (not the browser's own pass) so we control where the page scrolls.
    // Without JS the browser's built-in validation still applies.
    form.noValidate = true;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        // Bring the first empty field into view, but keep "Send my note" on screen too
        var first = form.querySelector(':invalid');
        revealForm(first, true);
        first.focus({ preventScroll: true });
        form.reportValidity();
        return;
      }
      if (sending) return;

      // Honeypot: people never see this box. If it's ticked, act as if it worked and send nothing.
      var trap = form.querySelector('[name="botcheck"]');
      if (trap && trap.checked) { showStatus('ok'); form.reset(); return; }

      var payload = {};
      new FormData(form).forEach(function (value, key) {
        payload[key] = typeof value === 'string' ? value.trim() : value;
      });

      setSending(true);
      var controller = 'AbortController' in window ? new AbortController() : null;
      var timer = setTimeout(function () { if (controller) controller.abort(); }, SEND_TIMEOUT_MS);
      fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (json) {
            if (!res.ok || !json.success) throw new Error(json.message || 'HTTP ' + res.status);
          });
        })
        .then(function () {
          showStatus('ok');
          form.reset();
          confetti(submit, -1);
        })
        .catch(function () { showStatus('error'); })
        .then(function () { clearTimeout(timer); setSending(false); });
    });

    function setSending(on) {
      sending = on;
      submit.disabled = on;
      submit.setAttribute('aria-busy', String(on));
      if (on) showStatus('sending');
    }

    // kind: 'sending' | 'ok' | 'error'. The error names the email address as a link.
    function showStatus(kind) {
      if (!status) return;
      status.classList.toggle('is-error', kind === 'error');
      status.classList.toggle('is-ok', kind === 'ok');
      status.textContent = '';
      if (kind === 'sending') { status.textContent = t(MSG_SENDING); return; }
      if (kind === 'ok') { status.textContent = t(MSG_OK); return; }
      var parts = t(MSG_ERROR).split('{email}');
      var link = document.createElement('a');
      link.href = 'mailto:' + EMAIL;
      link.textContent = EMAIL;
      status.appendChild(document.createTextNode(parts[0]));
      status.appendChild(link);
      status.appendChild(document.createTextNode(parts[1] || ''));
    }
  });

  /* ---------- 6. Land on the contact form with "Send my note" in view ----------
     Used by every "Let's talk" link (href="#contact") and by form validation.
     Scrolls so the submit button sits just above the bottom of the screen, without
     pushing the top of the form (or the field to fix) under the sticky header. */
  function revealForm(focusEl, instant) {
    var form = document.querySelector('[data-contact-form]');
    if (!form) return;
    var header = document.querySelector('.site-header');
    var headerH = header ? header.offsetHeight : 0;
    var submitBtn = form.querySelector('[type="submit"]');
    var margin = 24;
    var top = (focusEl || form).getBoundingClientRect().top;
    var bottom = submitBtn.getBoundingClientRect().bottom;
    var delta = bottom - (window.innerHeight - margin);
    var maxDelta = top - (headerH + margin);
    // If everything can't fit: for a field to fix, keep that field visible;
    // for a "Let's talk" jump, keep "Send my note" visible.
    if (delta > maxDelta && (focusEl || bottom - top <= window.innerHeight - headerH - 2 * margin)) delta = maxDelta;
    window.scrollTo({ top: window.scrollY + delta, behavior: instant || reduceMotion ? 'instant' : 'smooth' });
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#contact"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    revealForm(null, false);
    history.replaceState(null, '', window.location.pathname + window.location.search + '#contact');
    // Move keyboard focus to the section heading without jumping the page again
    var h = document.getElementById('contact-title');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  });

  /* ---------- 5. Scroll progress (header, top left) ----------
     0% at the top of the page, 100% when the contact section
     ("Tell me what's eating your week") reaches the top of the screen.
     Confetti fires once on reaching 100%, and re-arms below 90%. */
  var progress = document.querySelector('[data-progress]');
  var contact = document.getElementById('contact');
  if (progress && contact) {
    var fill = progress.querySelector('.progress-fill');
    var num = progress.querySelector('.progress-num');
    var header = document.querySelector('.site-header');
    var armed = true, shown = -1;

    function updateProgress() {
      var headerH = header ? header.offsetHeight : 0;
      // Slightly before the exact top, so jumping via a "Let's talk" link also counts
      var target = contact.getBoundingClientRect().top + window.scrollY - headerH - 32;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var end = Math.max(1, Math.min(target, max));
      var p = Math.min(1, Math.max(0, window.scrollY / end));
      var pct = Math.round(p * 100);
      fill.style.transform = 'scaleX(' + p + ')';
      if (pct !== shown) { num.textContent = pct + '%'; shown = pct; }
      progress.classList.toggle('is-done', pct >= 100);
      if (pct >= 100 && armed) { armed = false; confetti(progress, 1); }
      if (pct < 90) armed = true;
    }
    // Cheap enough to run on every scroll event; no frame throttling needed
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    // Don't celebrate on load if the page opens already at the contact section
    updateProgress();
    if (shown >= 100) armed = false;
  }

  window.__maReady = true;
})();
