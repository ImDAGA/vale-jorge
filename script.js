(() => {
  'use strict';

  // TODO: point this at a real RSVP backend before going live — e.g. a
  // Google Apps Script Web App URL bound to a Sheet, or a Formspree-style
  // endpoint. Left blank for now, so submissions only show the local
  // thank-you message and are NOT stored anywhere.
  const RSVP_ENDPOINT = '';

  const WEDDING_DATE = new Date(2026, 9, 24, 17, 0, 0).getTime();
  const ADDRESS = 'Parque San Rafael, 30 Ruta 5 Norte, Lampa, Región Metropolitana, Chile';

  // ---------- Guest-group variants ----------
  // Four invitation variants share this one page:
  //   a (default, no param) — pareja, cena + fiesta. Original copy/fields.
  //   b (?group=b) — pareja, solo fiesta. Different ceremonia copy, no
  //     dietary-restriction field.
  //   c (?group=c) — sin pareja, solo fiesta. Same as b, plus no
  //     companion field.
  //   d (?group=d) — like a, but no hero tagline/reveal effect, and the
  //     turntable illustration swaps its lid detail (no "Play" CTA) since
  //     the trigger is just the first scroll, not a click target.
  // Routed via clean URLs (/b, /c, /d) that Vercel rewrites to this page
  // with the query param — see vercel.json.
  const GUEST_GROUP = new URLSearchParams(window.location.search).get('group');
  const IS_GROUP_D = GUEST_GROUP === 'd';

  const CEREMONIA_BODY_BC =
    "Acompáñanos celebrando el mejor día de nuestras vidas como nos gusta: con buena música y - si vienes - mejor compañía todavía. Será una noche inolvidable.";

  if (GUEST_GROUP === 'b' || GUEST_GROUP === 'c') {
    const ceremoniaBody = document.getElementById('ceremoniaBody');
    if (ceremoniaBody) ceremoniaBody.textContent = CEREMONIA_BODY_BC;

    const dietaryField = document.getElementById('rsvpDietaryField');
    if (dietaryField) dietaryField.hidden = true;
  }

  if (GUEST_GROUP === 'c') {
    const companionField = document.getElementById('rsvpCompanionField');
    if (companionField) companionField.hidden = true;
  }

  if (IS_GROUP_D) {
    document.documentElement.classList.add('group-d');

    const heroTaglineWrap = document.querySelector('.hero__tagline-wrap');
    if (heroTaglineWrap) heroTaglineWrap.hidden = true;

    // Use setAttribute/removeAttribute rather than the .hidden property —
    // these are <g> (SVG) elements, and .hidden reflection isn't as
    // reliably supported on SVG elements as it is on HTML ones.
    const heroCta = document.getElementById('hero-cta');
    if (heroCta) heroCta.setAttribute('hidden', '');

    const heroLidDetail = document.getElementById('hero-lid-detail');
    if (heroLidDetail) heroLidDetail.removeAttribute('hidden');
  }

  const hero = document.getElementById('hero');
  const heroTagline = document.getElementById('heroTagline');
  const audio = document.getElementById('bgAudio');
  const playToggle = document.getElementById('playToggle');
  const playIconBars = document.getElementById('playIconBars');
  const playIconPlay = document.getElementById('playIconPlay');
  const tagline1 = document.getElementById('tagline1');
  const tagline2 = document.getElementById('tagline2');

  // ---------- Hero tagline word spans ----------
  // Group d has no hero tagline/reveal effect at all (see above).
  const TAGLINE_TEXT = "Maybe you're amazed, that we're (finally) getting married";
  const words = IS_GROUP_D ? [] : TAGLINE_TEXT.split(' ');
  const wordSpans = words.map((w) => {
    const span = document.createElement('span');
    span.textContent = w + ' ';
    heroTagline.appendChild(span);
    return span;
  });

  function renderTagline(progress) {
    const n = words.length;
    wordSpans.forEach((span, i) => {
      const opacity = Math.max(0.08, Math.min(1, progress * n - i));
      span.style.opacity = opacity;
    });
  }
  renderTagline(0);

  // ---------- Map / Waze links ----------
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(ADDRESS);
  const wazeUrl = 'https://waze.com/ul?q=' + encodeURIComponent(ADDRESS) + '&navigate=yes';
  document.getElementById('mapsLink').href = mapsUrl;
  document.getElementById('wazeLink').href = wazeUrl;

  // ---------- State ----------
  let revealProgress = 0;
  let started = false;
  let isPlaying = false;
  let pastHero = false;
  let touchStartY = null;

  function isLocked() {
    // Group d has no reveal to gate scroll behind — it should scroll
    // normally from the very first gesture.
    return !IS_GROUP_D && revealProgress < 1;
  }

  function startExperience() {
    if (started) return;
    started = true;
    hero.classList.add('is-started');
    audio.volume = 0.8;
    audio.play().catch(() => {});
  }

  function bumpProgress(delta) {
    const next = Math.max(0, Math.min(1, revealProgress + delta));
    if (next !== revealProgress) {
      revealProgress = next;
      renderTagline(revealProgress);
    }
  }

  function handleWheel(e) {
    if (!isLocked()) return;
    e.preventDefault();
    if (!started) startExperience();
    bumpProgress(e.deltaY / 1600);
  }

  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchMove(e) {
    if (!isLocked()) return;
    e.preventDefault();
    if (!started) startExperience();
    const y = e.touches[0].clientY;
    const delta = touchStartY - y;
    touchStartY = y;
    bumpProgress(delta / 550);
  }

  const DOWN_KEYS = ['ArrowDown', 'PageDown', ' '];
  const UP_KEYS = ['ArrowUp', 'PageUp'];

  function handleKeyDown(e) {
    if (!isLocked()) return;
    if (DOWN_KEYS.includes(e.key)) {
      e.preventDefault();
      if (!started) startExperience();
      bumpProgress(0.07);
    } else if (UP_KEYS.includes(e.key)) {
      e.preventDefault();
      bumpProgress(-0.07);
    }
  }

  window.addEventListener('wheel', handleWheel, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('keydown', handleKeyDown);

  // Wheel/scroll isn't treated as a user-activation gesture by browser
  // autoplay policies (unlike click/key/tap), so a mouse-wheel or trackpad
  // scroll alone can silently fail to start audio. Catch the first
  // qualifying gesture of any kind as a fallback so sound still starts.
  function handleFirstGesture() {
    if (!started) startExperience();
  }
  window.addEventListener('pointerdown', handleFirstGesture);
  window.addEventListener('click', handleFirstGesture);

  // "Play (Click aquí)" CTA drawn on the turntable lid — explicit handling
  // so it also works via keyboard (native buttons respond to Enter, and
  // Space is already handled globally for the scroll-reveal).
  const heroCta = document.getElementById('hero-cta');
  if (heroCta) {
    heroCta.addEventListener('click', () => {
      if (!started) startExperience();
    });
    heroCta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!started) startExperience();
      }
    });
  }

  // ---------- Pause/Play button ----------
  function updatePlayToggleIcon() {
    playIconBars.hidden = !isPlaying;
    playIconPlay.hidden = isPlaying;
  }

  function togglePlay() {
    if (audio.paused) {
      started = true;
      hero.classList.add('is-started');
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }

  // Drive the icon off the audio element's real state, not an optimistic
  // guess — play() can silently fail (autoplay blocked) or the file can
  // still be buffering, and the icon should never claim it's playing
  // when it isn't.
  audio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayToggleIcon();
  });
  audio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayToggleIcon();
  });

  playToggle.addEventListener('click', togglePlay);
  updatePlayToggleIcon();

  // ---------- Secondary lyric reveal-on-scroll ----------
  let tagline1Revealed = false;
  let tagline2Revealed = false;

  function handlePageScroll() {
    // Group d isn't scroll-locked, so it never goes through
    // handleWheel/handleTouchMove — the first real page scroll is what
    // should start the vinyl spin + audio for it.
    if (!started && window.scrollY > 0) startExperience();

    const past = window.scrollY > window.innerHeight * 0.6;
    if (past !== pastHero) {
      pastHero = past;
      playToggle.classList.toggle('is-visible', pastHero);
    }

    if (!tagline1Revealed) {
      const rect = tagline1.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.85) {
        tagline1Revealed = true;
        tagline1.classList.add('is-revealed');
      }
    }

    if (!tagline2Revealed) {
      const rect2 = tagline2.getBoundingClientRect();
      if (rect2.top < window.innerHeight * 0.85) {
        tagline2Revealed = true;
        tagline2.classList.add('is-revealed');
      }
    }
  }

  window.addEventListener('scroll', handlePageScroll, { passive: true });
  handlePageScroll();
  setTimeout(handlePageScroll, 300);

  // ---------- Countdown timer ----------
  function pad(n) {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  const cdDays = document.getElementById('cdDays');
  const cdHours = document.getElementById('cdHours');
  const cdMinutes = document.getElementById('cdMinutes');
  const cdSeconds = document.getElementById('cdSeconds');

  function tickCountdown() {
    const diff = Math.max(0, WEDDING_DATE - Date.now());
    cdDays.textContent = pad(Math.floor(diff / 86400000));
    cdHours.textContent = pad(Math.floor((diff % 86400000) / 3600000));
    cdMinutes.textContent = pad(Math.floor((diff % 3600000) / 60000));
    cdSeconds.textContent = pad(Math.floor((diff % 60000) / 1000));
  }

  tickCountdown();
  setInterval(tickCountdown, 1000);

  // ---------- RSVP form ----------
  const rsvpForm = document.getElementById('rsvpForm');
  const rsvpThanks = document.getElementById('rsvpThanks');
  const attendYesBtn = document.getElementById('attendYes');
  const attendNoBtn = document.getElementById('attendNo');
  let attending = null;

  function setAttending(value) {
    attending = value;
    attendYesBtn.classList.toggle('is-active', attending === 'si');
    attendNoBtn.classList.toggle('is-active', attending === 'no');
  }

  attendYesBtn.addEventListener('click', () => setAttending('si'));
  attendNoBtn.addEventListener('click', () => setAttending('no'));

  rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('rsvpName').value,
      companion: document.getElementById('rsvpCompanion').value,
      attending,
      dietary: document.getElementById('rsvpDietary').value,
      group: GUEST_GROUP || 'a',
    };

    if (RSVP_ENDPOINT) {
      try {
        // Content-Type must stay text/plain — a Google Apps Script Web
        // App has no CORS headers, so a "real" cross-origin content type
        // like application/json would trigger a preflight it can't
        // answer. text/plain keeps this a "simple request" (no
        // preflight); the body is still valid JSON text, and the Apps
        // Script side parses it with JSON.parse(e.postData.contents).
        await fetch(RSVP_ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error('RSVP submission failed', err);
      }
    } else {
      console.warn('RSVP_ENDPOINT is not configured — response was not saved anywhere.', payload);
    }

    rsvpForm.hidden = true;
    rsvpThanks.hidden = false;
  });
})();
