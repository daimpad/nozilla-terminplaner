/* ============================================================================
   nozilla Terminplaner — Abgleich mit dem eigenen Google-Kalender

   Beim Anlegen einer Umfrage zeigt die Seite neben jedem Termin, ob man selbst
   frei oder belegt ist, und schlägt freie Zeiten vor.

   - Aktiv nur, wenn config.js eine Google-Client-ID setzt. Ohne sie lädt die
     Seite nichts von Google, und dieses Feld bleibt unsichtbar.
   - Gefragt wird nur frei oder belegt (Free/Busy), nie Titel, Orte oder
     Teilnehmende. Dazu die Liste der Kalender, damit man wählen kann, welche
     zählen: etwa ein zweiter Kalender, der dem Konto freigegeben ist.
   - Der Zugangsschlüssel bleibt im Speicher dieser Seite und verfällt nach
     einer Stunde. Gespeichert wird nur, welche Kalender ausgewählt sind.
   - Nichts davon landet in der Umfrage oder in Firebase.
============================================================================ */
(function () {
  'use strict';

  var SCOPES = 'https://www.googleapis.com/auth/calendar.freebusy ' +
               'https://www.googleapis.com/auth/calendar.calendarlist.readonly';
  var API = 'https://www.googleapis.com/calendar/v3';
  var STORE = 'tp_cal_ids';

  // Vorschläge: Werktage, 9 bis 17 Uhr, die nächsten 14 Tage, höchstens zwei je Tag
  var SUGGEST = { days: 14, from: 9, to: 17, step: 30, perDay: 2, max: 6 };

  var cal = { client: null, token: null, expires: 0, calendars: [], selected: [], busy: [], range: null };

  function $(id) { return document.getElementById(id); }
  function clientId() { return window.NZ_GOOGLE_CLIENT_ID || null; }

  // Dauer der Umfrage in Minuten, wie sie gerade im Formular steht
  function duration() {
    var el = $('pollDuration');
    return (el && parseInt(el.value, 10)) || 60;
  }

  function slot(datetime) {
    var start = new Date(datetime).getTime();
    return { start: start, end: start + duration() * 60000 };
  }

  function busyAt(s) {
    return cal.busy.some(function (b) { return b.start < s.end && b.end > s.start; });
  }

  // pollData ist im Hauptskript mit let deklariert und hängt deshalb nicht an window
  function options() { return typeof pollData !== 'undefined' ? pollData.options : []; }

  function connected() { return !!cal.token && Date.now() < cal.expires && cal.range; }

  /* ── Anzeige ─────────────────────────────────────────────────────────── */

  // Marke neben einem vorgeschlagenen Termin; leer, solange nicht verbunden
  window.calSlotTag = function (datetime) {
    if (!connected()) return '';
    var s = slot(datetime);
    if (s.start < cal.range.start || s.end > cal.range.end) return '<span class="slot-tag">nicht geprüft</span>';
    return busyAt(s)
      ? '<span class="slot-tag is-busy">belegt</span>'
      : '<span class="slot-tag is-free">frei</span>';
  };

  function setStatus(text, warn) {
    var el = $('calStatus');
    el.textContent = text;
    el.classList.toggle('is-warn', !!warn);
  }

  function updateCandidate() {
    var out = $('newOptionStatus');
    var v = $('newOption').value;
    if (!connected() || !v) { out.innerHTML = ''; return; }
    out.innerHTML = 'Dieser Termin: ' + window.calSlotTag(v);
  }

  function refreshAll() {
    if (typeof renderOptions === 'function') renderOptions();
    updateCandidate();
    renderSuggestions();
  }

  /* ── Anmeldung ───────────────────────────────────────────────────────── */

  function loadGis(done) {
    if (window.google && google.accounts && google.accounts.oauth2) return done();
    var s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = done;
    s.onerror = function () { setStatus('Die Google-Anmeldung ließ sich nicht laden.', true); };
    document.head.appendChild(s);
  }

  window.calConnect = function () {
    if (!clientId()) return;
    $('calConnect').disabled = true;
    loadGis(function () {
      if (!cal.client) {
        cal.client = google.accounts.oauth2.initTokenClient({
          client_id: clientId(),
          scope: SCOPES,
          callback: onToken,
          error_callback: function (err) {
            $('calConnect').disabled = false;
            setStatus(err && err.type === 'popup_closed'
              ? 'Anmeldung abgebrochen.'
              : 'Anmeldung fehlgeschlagen. Ist diese Adresse in der Google Cloud Console erlaubt?', true);
          }
        });
      }
      cal.client.requestAccessToken({ prompt: '' });
    });
  };

  function onToken(resp) {
    $('calConnect').disabled = false;
    if (!resp || resp.error || !resp.access_token) {
      setStatus('Google hat den Zugriff nicht erlaubt.', true);
      return;
    }
    cal.token = resp.access_token;
    cal.expires = Date.now() + (parseInt(resp.expires_in, 10) || 3600) * 1000 - 60000;
    $('calConnect').textContent = 'Neu abgleichen';
    loadCalendars();
  }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ Authorization: 'Bearer ' + cal.token }, opts.headers || {});
    return fetch(API + path, opts).then(function (r) {
      if (r.status === 401) {
        cal.token = null;
        throw new Error('Die Verbindung ist abgelaufen. Bitte neu abgleichen.');
      }
      if (!r.ok) throw new Error('Google antwortet mit Fehler ' + r.status + '.');
      return r.json();
    });
  }

  /* ── Kalender wählen ─────────────────────────────────────────────────── */

  function loadCalendars() {
    setStatus('Kalender werden geladen …');
    api('/users/me/calendarList?minAccessRole=freeBusyReader&fields=items(id,summary,primary,selected)')
      .then(function (data) {
        cal.calendars = (data.items || []).sort(function (a, b) { return (b.primary ? 1 : 0) - (a.primary ? 1 : 0); });
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) {}
        var ids = cal.calendars.map(function (c) { return c.id; });
        cal.selected = Array.isArray(saved)
          ? saved.filter(function (id) { return ids.indexOf(id) >= 0; })
          : cal.calendars.filter(function (c) { return c.primary || c.selected; }).map(function (c) { return c.id; });
        renderCalendars();
        return loadBusy();
      })
      .catch(function (e) { setStatus(e.message, true); });
  }

  function renderCalendars() {
    var box = $('calList');
    box.innerHTML = cal.calendars.map(function (c) {
      var on = cal.selected.indexOf(c.id) >= 0 ? ' checked' : '';
      return '<label class="calcheck__item"><input type="checkbox" value="' + esc(c.id) + '"' + on + '> ' +
        '<span>' + esc(c.summary || c.id) + (c.primary ? ' <span class="nz-label">Haupt</span>' : '') + '</span></label>';
    }).join('');
    box.classList.toggle('hidden', !cal.calendars.length);
    box.querySelectorAll('input').forEach(function (input) {
      input.addEventListener('change', function () {
        cal.selected = Array.prototype.map.call(box.querySelectorAll('input:checked'), function (i) { return i.value; });
        try { localStorage.setItem(STORE, JSON.stringify(cal.selected)); } catch (e) {}
        loadBusy();
      });
    });
  }

  /* ── Frei oder belegt ────────────────────────────────────────────────── */

  // Abgefragt wird ab jetzt bis zum spätesten Termin, mindestens 60 Tage
  function wantedRange() {
    var start = Date.now();
    var end = start + 60 * 86400000;
    options().forEach(function (o) {
      end = Math.max(end, slot(o.datetime).end + 86400000);
    });
    return { start: start, end: end };
  }

  function loadBusy() {
    if (!cal.selected.length) {
      cal.busy = [];
      cal.range = wantedRange();
      setStatus('Kein Kalender ausgewählt. Alle Termine gelten als frei.', true);
      refreshAll();
      return Promise.resolve();
    }
    var range = wantedRange();
    setStatus('Kalender werden abgeglichen …');
    return api('/freeBusy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeMin: new Date(range.start).toISOString(),
        timeMax: new Date(range.end).toISOString(),
        items: cal.selected.map(function (id) { return { id: id }; })
      })
    }).then(function (data) {
      var busy = [], failed = 0;
      Object.keys(data.calendars || {}).forEach(function (id) {
        var c = data.calendars[id];
        if (c.errors && c.errors.length) { failed++; return; }
        (c.busy || []).forEach(function (b) {
          busy.push({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() });
        });
      });
      cal.busy = busy;
      cal.range = range;
      var n = cal.selected.length - failed;
      setStatus('Abgeglichen mit ' + n + (n === 1 ? ' Kalender' : ' Kalendern') + '.' +
        (failed ? ' ' + failed + ' ließ sich nicht lesen.' : ''), !!failed);
      refreshAll();
    }).catch(function (e) { setStatus(e.message, true); });
  }

  /* ── Freie Zeiten vorschlagen ────────────────────────────────────────── */

  function localValue(ms) {
    var d = new Date(ms);
    return new Date(ms - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  function suggestions() {
    var taken = options().map(function (o) { return o.datetime; });
    var out = [];
    var day = new Date();
    day.setHours(0, 0, 0, 0);
    for (var d = 1; d <= SUGGEST.days && out.length < SUGGEST.max; d++) {
      var date = new Date(day.getTime());
      date.setDate(date.getDate() + d);
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      var perDay = 0;
      for (var m = SUGGEST.from * 60; m + duration() <= SUGGEST.to * 60 && perDay < SUGGEST.perDay; m += SUGGEST.step) {
        var start = new Date(date.getTime());
        start.setHours(0, m, 0, 0);
        var value = localValue(start.getTime());
        var s = slot(value);
        if (taken.indexOf(value) >= 0 || s.end > cal.range.end || busyAt(s)) continue;
        out.push(value);
        perDay++;
        m += duration();   // nicht zwei überlappende Vorschläge am selben Tag
      }
    }
    return out.slice(0, SUGGEST.max);
  }

  function renderSuggestions() {
    var box = $('calSuggest');
    if (!connected()) { box.classList.add('hidden'); return; }
    var list = suggestions();
    var fmt = { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' };
    box.innerHTML = '<div class="nz-label">Freie Zeiten, ' + esc(document.querySelector('#pollDuration option:checked').textContent) + '</div>' +
      (list.length
        ? '<div class="calcheck__chips">' + list.map(function (v) {
            return '<button type="button" class="calcheck__chip" data-v="' + v + '">' +
              esc(new Date(v).toLocaleString('de-DE', fmt).replace(' um ', ' ')) + '</button>';
          }).join('') + '</div>'
        : '<p class="calcheck__status">In den nächsten zwei Wochen ist werktags zwischen 9 und 17 Uhr nichts frei.</p>');
    box.classList.remove('hidden');
    box.querySelectorAll('.calcheck__chip').forEach(function (b) {
      b.addEventListener('click', function () {
        $('newOption').value = b.getAttribute('data-v');
        addOption();
      });
    });
  }

  /* ── Start ───────────────────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    if (!clientId()) return;
    $('calPanel').classList.remove('hidden');
    $('newOption').addEventListener('input', updateCandidate);
    $('pollDuration').addEventListener('change', refreshAll);
  });

  // Nach jedem Hinzufügen oder Entfernen Status und Vorschläge nachziehen
  document.addEventListener('click', function (e) {
    if (connected() && e.target.closest && e.target.closest('#createSection button')) setTimeout(function () {
      // Liegt ein Termin hinter dem abgefragten Zeitraum, neu abfragen statt „nicht geprüft“
      var beyond = options().some(function (o) { return slot(o.datetime).end > cal.range.end; });
      if (beyond) return loadBusy();
      updateCandidate();
      renderSuggestions();
    }, 0);
  });
})();
