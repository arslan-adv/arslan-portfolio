/* Contact form — client validation + one EmailJS email per submission. */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var config = window.PORTFOLIO_CONFIG || {};

  var SUBMIT_COOLDOWN = 30 * 1000;
  var lastSubmitAt = 0;
  var sending = false;

  var nameEl = document.getElementById('cf-name');
  var emailEl = document.getElementById('cf-email');
  var subjectEl = document.getElementById('cf-subject');
  var messageEl = document.getElementById('cf-message');
  var honeypotEl = document.getElementById('cf-company');
  var submitBtn = document.getElementById('cf-submit');
  var statusEl = document.getElementById('cf-status');

  function ensureEmailJS() {
    if (!window.emailjs) return false;
    if (!emailjs.__portfolioInited) {
      try {
        emailjs.init(config.publicKey);
        emailjs.__portfolioInited = true;
      } catch (e) {
        return false;
      }
    }
    return true;
  }

  ensureEmailJS();

  function showStatus(message, type) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.className = 'form-status' + (type === 'error' ? ' is-error' : ' is-success');
  }

  function clearStatus() {
    if (statusEl) {
      statusEl.textContent = '';
      statusEl.className = 'form-status';
    }
  }

  function setFieldError(field, errId, message) {
    var wrap = field.closest('.field');
    if (wrap) wrap.classList.toggle('field--error', !!message);
    var err = document.getElementById(errId);
    if (err) err.textContent = message || '';
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    var name = nameEl ? nameEl.value.trim() : '';
    var email = emailEl ? emailEl.value.trim() : '';
    var subject = subjectEl ? subjectEl.value.trim() : '';
    var message = messageEl ? messageEl.value.trim() : '';
    var ok = true;

    if (!name) {
      setFieldError(nameEl, 'cf-name-error', 'Please enter your name.');
      ok = false;
    } else {
      setFieldError(nameEl, 'cf-name-error', '');
    }

    if (!email) {
      setFieldError(emailEl, 'cf-email-error', 'Please enter your email address.');
      ok = false;
    } else if (!isValidEmail(email)) {
      setFieldError(emailEl, 'cf-email-error', 'Please enter a valid email address.');
      ok = false;
    } else {
      setFieldError(emailEl, 'cf-email-error', '');
    }

    if (!subject) {
      setFieldError(subjectEl, 'cf-subject-error', 'Please add a subject.');
      ok = false;
    } else {
      setFieldError(subjectEl, 'cf-subject-error', '');
    }

    if (!message) {
      setFieldError(messageEl, 'cf-message-error', 'Please write a message.');
      ok = false;
    } else if (message.length < 10) {
      setFieldError(messageEl, 'cf-message-error', 'Your message should be at least 10 characters.');
      ok = false;
    } else {
      setFieldError(messageEl, 'cf-message-error', '');
    }

    return ok;
  }

  function setSubmitting(state) {
    sending = state;
    if (submitBtn) submitBtn.disabled = state;
    [nameEl, emailEl, subjectEl, messageEl].forEach(function (field) {
      if (field) field.disabled = state;
    });
    if (submitBtn) submitBtn.textContent = state ? 'Sending\u2026' : 'Send Message';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;

    var now = Date.now();
    if (now - lastSubmitAt < SUBMIT_COOLDOWN) {
      showStatus('Please wait a moment before sending another message.', 'error');
      return;
    }

    if (honeypotEl && honeypotEl.value.trim() !== '') {
      form.reset();
      return;
    }

    if (!validate()) {
      showStatus('Please fix the highlighted fields and try again.', 'error');
      var firstInvalid = form.querySelector('.field--error input, .field--error textarea');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    var params = {
      user_name: nameEl.value.trim(),
      user_email: emailEl.value.trim(),
      title: subjectEl.value.trim(),
      message: messageEl.value.trim(),
      current_page: window.location.pathname,
      referrer: document.referrer ? String(document.referrer).split('?')[0] : 'Direct Visit',
      time: new Date().toLocaleString()
    };

    clearStatus();
    setSubmitting(true);

    if (!ensureEmailJS()) {
      setSubmitting(false);
      showStatus(
        'Something went wrong while sending your message. Please try again or contact me directly by email.',
        'error'
      );
      return;
    }

    emailjs.send(config.serviceId, config.contactTemplateId, params).then(
      function () {
        setSubmitting(false);
        lastSubmitAt = Date.now();
        form.reset();
        if (submitBtn) submitBtn.textContent = 'Message Sent \u2713';
        showStatus('Thanks for reaching out! Your message has been sent.', 'success');
        setTimeout(function () {
          if (submitBtn && !sending) submitBtn.textContent = 'Send Message';
        }, 6000);
      },
      function (err) {
        setSubmitting(false);
        showStatus(
          'Something went wrong while sending your message. Please try again or contact me directly by email.',
          'error'
        );
        if (window.console && console.warn) {
          console.warn('Contact notification failed:', err && err.message ? err.message : 'unknown');
        }
      }
    );
  });
})();