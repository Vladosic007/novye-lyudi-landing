/* =========================================================================
   Новые люди — лендинг · интерактив
   Меню · анимация появления · активный пункт · маска телефона · форма
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* --- Реф-метка (?ref=КОД): сохраняем и прикрепляем к заявке --- */
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
  var toggle = $('#nav-toggle');
  var links = $('#nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('#nav-links a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --- Появление секций при скролле --- */
  var revEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revEls.forEach(function (el) { io.observe(el); });
  } else {
    revEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* --- Активный пункт меню по секции на экране --- */
  var sections = $$('section[id], header[id]');
  if ('IntersectionObserver' in window && sections.length) {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = $('#nav-links a[href="#' + e.target.id + '"]');
        if (link) link.classList.toggle('is-active', e.isIntersecting);
      });
    }, { threshold: 0.5 });
    sections.forEach(function (s) { io2.observe(s); });
  }

  /* --- Маска телефона: +7 (___) ___-__-__ --- */
  function formatPhone(value) {
    var d = value.replace(/\D/g, '');
    if (d.charAt(0) === '8') d = '7' + d.slice(1);
    if (d.charAt(0) !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var p = d.slice(1); // до 10 цифр
    var out = '+7';
    if (p.length > 0) out += ' (' + p.slice(0, 3);
    if (p.length >= 3) out += ')';
    if (p.length > 3) out += ' ' + p.slice(3, 6);
    if (p.length > 6) out += '-' + p.slice(6, 8);
    if (p.length > 8) out += '-' + p.slice(8, 10);
    return out;
  }
  var phone = $('#phone');
  if (phone) {
    phone.addEventListener('input', function () { phone.value = formatPhone(phone.value); });
    phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 '; });
    phone.addEventListener('blur', function () { if (phone.value === '+7 ' || phone.value === '+7') phone.value = ''; });
  }

  /* --- Табы формы (тип заявки) --- */
  var typeField = $('#app-type');
  var expField = $('#field-experience');
  var formTabs = $$('.form-tab');
  function setType(t) {
    if (typeField) typeField.value = t;
    formTabs.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-type') === t); });
    if (expField) expField.style.display = (t === 'наблюдатель') ? '' : 'none';
  }
  formTabs.forEach(function (b) { b.addEventListener('click', function () { setType(b.getAttribute('data-type')); }); });

  /* --- Форма: валидация + отправка --- */
  var form = $('#apply-form');
  if (form) {
    function mark(el, isErr) {
      if (!el) return;
      el.classList.toggle('field-error', isErr);
      var box = el.closest('.field');
      var em = box && box.querySelector('.err-msg');
      if (em) em.classList.toggle('show', isErr);
    }

    var val = function (id) { var e = $(id); return e ? e.value.trim() : ''; };
    $$('.input, .textarea', form).forEach(function (el) {
      el.addEventListener('input', function () { mark(el, false); });
    });
    var consent = $('#consent');
    var consentErr = $('#consent-err');
    if (consent) consent.addEventListener('change', function () {
      if (consent.checked && consentErr) consentErr.classList.remove('show');
    });
    var adult = $('#adult');
    var adultErr = $('#adult-err');
    if (adult) adult.addEventListener('change', function () {
      if (adult.checked && adultErr) adultErr.classList.remove('show');
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      // honeypot — если заполнен, тихо выходим (это бот)
      if (form.website && form.website.value) return;

      var surname = $('#surname'), firstName = $('#first-name');
      var ok = true;

      if (!surname.value.trim()) { mark(surname, true); ok = false; }
      if (!firstName.value.trim()) { mark(firstName, true); ok = false; }
      var digits = (phone.value || '').replace(/\D/g, '');
      if (digits.length < 11) { mark(phone, true); ok = false; }
      if (consent && !consent.checked) { if (consentErr) consentErr.classList.add('show'); ok = false; }
      if (adult && !adult.checked) { if (adultErr) adultErr.classList.add('show'); ok = false; }
      if (!ok) return;

      var globalErr = $('#form-global-err');
      if (globalErr) globalErr.classList.remove('show');

      var btn = $('#submit-btn');
      var original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = 'Отправляем…';

      var payload = {
        type: typeField ? typeField.value : 'вступить',
        name: [val('#surname'), val('#first-name'), val('#patronymic')].filter(Boolean).join(' '),
        surname: val('#surname'),
        first_name: val('#first-name'),
        patronymic: val('#patronymic'),
        birthdate: val('#birthdate'),
        phone: phone.value.trim(),
        email: val('#email'),
        region: val('#region'),
        city: val('#city'),
        experience: val('#experience'),
        consent: !!(consent && consent.checked),
        adult: !!(adult && adult.checked),
        ref: getRef(),
        source: location.href
      };

      fetch(form.getAttribute('action') || '/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res; })
        .then(function () {
          form.style.display = 'none';
          var tabs = $('.form-tabs'); if (tabs) tabs.style.display = 'none';
          var success = $('#form-success');
          if (success) success.classList.add('show');
        })
        .catch(function (err) {
          console.error('Ошибка отправки:', err);
          if (globalErr) globalErr.classList.add('show');
          btn.disabled = false;
          btn.innerHTML = original;
        });
    });
  }

  /* --- Липкая кнопка на мобилке: показываем после hero, прячем в форме --- */
  var mcta = $('.mobile-cta');
  var hero = $('.hero');
  var formSec = $('#zayavka');
  if (mcta && hero && 'IntersectionObserver' in window) {
    var pastHero = false, inForm = false;
    var update = function () { mcta.classList.toggle('show', pastHero && !inForm); };
    new IntersectionObserver(function (e) { pastHero = !e[0].isIntersecting; update(); }, { threshold: 0 }).observe(hero);
    if (formSec) new IntersectionObserver(function (e) { inForm = e[0].isIntersecting; update(); }, { threshold: 0.15 }).observe(formSec);
  }

  /* --- Cookie-баннер --- */
  var cookie = $('#cookie');
  if (cookie) {
    var seen = false;
    try { seen = !!localStorage.getItem('nl_cookie'); } catch (e) {}
    if (!seen) cookie.hidden = false;
    var cok = $('#cookie-ok');
    if (cok) cok.addEventListener('click', function () {
      try { localStorage.setItem('nl_cookie', '1'); } catch (e) {}
      cookie.hidden = true;
    });
  }

  /* --- Год в подвале --- */
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
