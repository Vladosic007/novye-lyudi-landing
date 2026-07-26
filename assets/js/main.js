/* =========================================================================
   Новые люди — лендинг · интерактив
   Меню · анимации · маска телефона · форма-подпись · модалка наблюдателя · cookie
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Реф-метка (?ref=КОД) --- */
  try {
    var _ref = new URLSearchParams(location.search).get('ref');
    if (_ref) localStorage.setItem('nl_ref', _ref.slice(0, 40));
  } catch (e) {}
  function getRef() { try { return localStorage.getItem('nl_ref') || ''; } catch (e) { return ''; } }

  /* --- Тень навбара при скролле --- */
  var navWrap = $('.nav-wrap');
  function onScroll() { if (navWrap) navWrap.classList.toggle('scrolled', window.scrollY > 10); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* --- Мобильное меню --- */
  var toggle = $('#nav-toggle'), links = $('#nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('#nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* --- Появление секций при скролле --- */
  var revEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revEls.forEach(function (el) { io.observe(el); });
  } else { revEls.forEach(function (el) { el.classList.add('is-visible'); }); }

  /* --- Активный пункт меню --- */
  var sections = $$('section[id], header[id]');
  if ('IntersectionObserver' in window && sections.length) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { var link = $('#nav-links a[href="#' + e.target.id + '"]'); if (link) link.classList.toggle('is-active', e.isIntersecting); });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { io2.observe(s); });
  }

  /* --- Маска телефона для всех полей type=tel --- */
  function formatPhone(value) {
    var d = value.replace(/\D/g, '');
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d.charAt(0) !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var p = d.slice(1), out = '+7';
    if (p.length > 0) out += ' (' + p.slice(0, 3);
    if (p.length >= 3) out += ')';
    if (p.length > 3) out += ' ' + p.slice(3, 6);
    if (p.length > 6) out += '-' + p.slice(6, 8);
    if (p.length > 8) out += '-' + p.slice(8, 10);
    return out;
  }
  $$('input[type="tel"]').forEach(function (ph) {
    ph.addEventListener('input', function () { ph.value = formatPhone(ph.value); });
    ph.addEventListener('focus', function () { if (!ph.value) ph.value = '+7 '; });
    ph.addEventListener('blur', function () { if (ph.value === '+7 ' || ph.value === '+7') ph.value = ''; });
  });

  /* --- Общий помощник ошибок --- */
  function markField(el, isErr) {
    if (!el) return;
    el.classList.toggle('field-error', isErr);
    var box = el.closest('.field'); var em = box && box.querySelector('.err-msg');
    if (em) em.classList.toggle('show', isErr);
  }
  function digits(v) { return (v || '').replace(/\D/g, ''); }

  /* --- Основная форма: ПОДПИСЬ --- */
  var form = $('#apply-form');
  if (form) {
    var name = $('#name'), phone = $('#phone'), consent = $('#consent'), adult = $('#adult');
    var consentErr = $('#consent-err'), adultErr = $('#adult-err'), globalErr = $('#form-global-err');
    $$('.input, .textarea', form).forEach(function (el) { el.addEventListener('input', function () { markField(el, false); }); });
    if (consent) consent.addEventListener('change', function () { if (consent.checked && consentErr) consentErr.classList.remove('show'); });
    if (adult) adult.addEventListener('change', function () { if (adult.checked && adultErr) adultErr.classList.remove('show'); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.website && form.website.value) return;
      var ok = true;
      if (!name.value.trim()) { markField(name, true); ok = false; }
      if (digits(phone.value).length < 11) { markField(phone, true); ok = false; }
      if (consent && !consent.checked) { if (consentErr) consentErr.classList.add('show'); ok = false; }
      if (adult && !adult.checked) { if (adultErr) adultErr.classList.add('show'); ok = false; }
      if (!ok) return;
      if (globalErr) globalErr.classList.remove('show');
      var btn = $('#submit-btn'), original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = 'Отправляем…';
      var payload = {
        type: 'подпись',
        name: name.value.trim(), phone: phone.value.trim(),
        comment: (form.comment ? form.comment.value.trim() : ''),
        consent: !!(consent && consent.checked), adult: !!(adult && adult.checked),
        ref: getRef(), source: location.href
      };
      fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; })
        .then(function () {
          form.style.display = 'none';
          var fa = $('.form-alt'); if (fa) fa.style.display = 'none';
          var s = $('#form-success'); if (s) s.classList.add('show');
        })
        .catch(function (err) { console.error(err); if (globalErr) globalErr.classList.add('show'); btn.disabled = false; btn.innerHTML = original; });
    });
  }

  /* --- Модалка «Стать наблюдателем» --- */
  var modal = $('#observer-modal');
  function openModal() { if (modal) { modal.hidden = false; document.body.style.overflow = 'hidden'; } }
  function closeModal() { if (modal) { modal.hidden = true; document.body.style.overflow = ''; } }
  $$('[data-observer-open]').forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); openModal(); }); });
  if (modal) {
    $$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', closeModal); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
  }

  /* --- Форма наблюдателя --- */
  var obsForm = $('#observer-form');
  if (obsForm) {
    var oVal = function (id) { var e = $(id); return e ? e.value.trim() : ''; };
    var oConsent = $('#obs-consent'), oAdult = $('#obs-adult');
    var oConsentErr = $('#obs-consent-err'), oAdultErr = $('#obs-adult-err'), oGlobalErr = $('#obs-global-err');
    $$('.input', obsForm).forEach(function (el) { el.addEventListener('input', function () { markField(el, false); }); });
    if (oConsent) oConsent.addEventListener('change', function () { if (oConsent.checked && oConsentErr) oConsentErr.classList.remove('show'); });
    if (oAdult) oAdult.addEventListener('change', function () { if (oAdult.checked && oAdultErr) oAdultErr.classList.remove('show'); });

    obsForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (obsForm.website && obsForm.website.value) return;
      var oSurname = $('#obs-surname'), oFirst = $('#obs-first-name'), oPhone = $('#obs-phone');
      var ok = true;
      if (!oSurname.value.trim()) { markField(oSurname, true); ok = false; }
      if (!oFirst.value.trim()) { markField(oFirst, true); ok = false; }
      if (digits(oPhone.value).length < 11) { markField(oPhone, true); ok = false; }
      if (oConsent && !oConsent.checked) { if (oConsentErr) oConsentErr.classList.add('show'); ok = false; }
      if (oAdult && !oAdult.checked) { if (oAdultErr) oAdultErr.classList.add('show'); ok = false; }
      if (!ok) return;
      if (oGlobalErr) oGlobalErr.classList.remove('show');
      var btn = $('#obs-submit'), original = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = 'Отправляем…';
      var payload = {
        type: 'наблюдатель',
        name: [oVal('#obs-surname'), oVal('#obs-first-name'), oVal('#obs-patronymic')].filter(Boolean).join(' '),
        surname: oVal('#obs-surname'), first_name: oVal('#obs-first-name'), patronymic: oVal('#obs-patronymic'),
        birthdate: oVal('#obs-birthdate'), phone: oPhone.value.trim(),
        region: oVal('#obs-region'), experience: oVal('#obs-experience'),
        consent: !!(oConsent && oConsent.checked), adult: !!(oAdult && oAdult.checked),
        ref: getRef(), source: location.href
      };
      fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r; })
        .then(function () { obsForm.style.display = 'none'; var s = $('#observer-success'); if (s) s.classList.add('show'); })
        .catch(function (err) { console.error(err); if (oGlobalErr) oGlobalErr.classList.add('show'); btn.disabled = false; btn.innerHTML = original; });
    });
  }

  /* --- Cookie-баннер --- */
  var cookie = $('#cookie');
  if (cookie) {
    var seen = false; try { seen = !!localStorage.getItem('nl_cookie'); } catch (e) {}
    if (!seen) cookie.hidden = false;
    var cok = $('#cookie-ok');
    if (cok) cok.addEventListener('click', function () { try { localStorage.setItem('nl_cookie', '1'); } catch (e) {} cookie.hidden = true; });
  }

  /* --- Липкая кнопка на мобилке --- */
  var mcta = $('.mobile-cta'), hero = $('.hero'), formSec = $('#zayavka');
  if (mcta && hero && 'IntersectionObserver' in window) {
    var pastHero = false, inForm = false;
    var update = function () { mcta.classList.toggle('show', pastHero && !inForm); };
    new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; update(); }, { threshold: 0 }).observe(hero);
    if (formSec) new IntersectionObserver(function (e) { inForm = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(formSec);
  }

  /* --- Год в подвале --- */
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();
})();
