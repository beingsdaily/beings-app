# Google Calendar Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Calendar OAuth 2.0 integration to the Schedule section of command-center.html, replacing manual event entry with a Connect button that loads today's events automatically.

**Architecture:** Use Google Identity Services (GIS) implicit token flow entirely client-side. Store the access token + expiry in localStorage. On page load, if a valid token exists, auto-fetch today's Google Calendar events; otherwise show a Connect button. The existing timeline render function is extended to merge/display GCal events.

**Tech Stack:** Vanilla JS, Google Identity Services (`accounts.google.com/gsi/client`), Google Calendar REST API v3, localStorage.

---

### Task 1: Load GIS script and add storage keys

**Files:**
- Modify: `command-center.html` (head section and storage keys block)

- [ ] **Step 1: Add GIS script tag to `<head>`**

In the `<head>` block (after the Google Fonts link), add:

```html
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

- [ ] **Step 2: Add storage keys for GCal token**

In the `// ── Storage keys ──` block (around line 1482), add two new constants after `DUMP_KEY`:

```js
const GCAL_TOKEN_KEY   = 'beings_gcal_token';
const GCAL_EXPIRY_KEY  = 'beings_gcal_expiry';
```

- [ ] **Step 3: Commit**

```bash
git -C /home/tonycharlesmoore/chat-app/public add command-center.html
git -C /home/tonycharlesmoore/chat-app/public commit -m "feat: load GIS script and add GCal storage keys"
```

---

### Task 2: Replace manual event entry HTML with GCal connect UI

**Files:**
- Modify: `command-center.html` (schedule card HTML, around line 1377)

- [ ] **Step 1: Replace the `add-event-row` div with the GCal connect UI**

Find this block (lines ~1381–1385):

```html
      <div class="add-event-row">
        <input class="input-sm input-time" id="event-time" type="text" placeholder="9:00" maxlength="8" />
        <input class="input-sm input-title" id="event-title" type="text" placeholder="Add an event…" maxlength="80" />
        <button class="btn-add" onclick="addEvent()">+</button>
      </div>
```

Replace with:

```html
      <div class="gcal-connect-row" id="gcal-connect-row">
        <button class="btn-gcal-connect" id="gcal-connect-btn" onclick="gcalConnect()">Connect Google Calendar</button>
      </div>
      <div class="gcal-connected-row" id="gcal-connected-row" style="display:none;">
        <span class="gcal-connected-label">● Connected</span>
        <button class="btn-gcal-refresh" onclick="gcalRefresh()">↺ Refresh</button>
        <button class="btn-gcal-disconnect" onclick="gcalDisconnect()">Disconnect</button>
      </div>
```

- [ ] **Step 2: Commit**

```bash
git -C /home/tonycharlesmoore/chat-app/public add command-center.html
git -C /home/tonycharlesmoore/chat-app/public commit -m "feat: replace manual event entry with GCal connect UI"
```

---

### Task 3: Add CSS for GCal connect UI

**Files:**
- Modify: `command-center.html` (style block, after `.add-event-row` styles around line 636)

- [ ] **Step 1: Add CSS after the `.add-event-row` rule block**

Find the `.add-event-row` CSS block (ends around line 658) and add after it:

```css
    /* ── GCal connect row ── */
    .gcal-connect-row,
    .gcal-connected-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0 2px;
    }
    .btn-gcal-connect {
      font-family: inherit;
      font-size: 0.78rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      padding: 7px 16px;
      border-radius: 8px;
      border: 1px solid var(--border-md);
      background: var(--bg-card2);
      color: var(--text);
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      width: 100%;
    }
    .btn-gcal-connect:hover {
      background: var(--accent-glow);
      border-color: var(--accent);
    }
    .gcal-connected-label {
      font-size: 0.72rem;
      color: var(--accent2);
      letter-spacing: 0.06em;
      flex: 1;
    }
    .btn-gcal-refresh,
    .btn-gcal-disconnect {
      font-family: inherit;
      font-size: 0.72rem;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text-dim);
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s;
    }
    .btn-gcal-refresh:hover { color: var(--accent); border-color: var(--accent); }
    .btn-gcal-disconnect:hover { color: #f87171; border-color: rgba(248,113,113,0.4); }
    .gcal-event { opacity: 0.9; }
    .gcal-event .timeline-time { color: var(--accent2); }
```

- [ ] **Step 2: Commit**

```bash
git -C /home/tonycharlesmoore/chat-app/public add command-center.html
git -C /home/tonycharlesmoore/chat-app/public commit -m "feat: add CSS for GCal connect/connected UI"
```

---

### Task 4: Add GCal JS module

**Files:**
- Modify: `command-center.html` (script block, after `deleteEvent` function around line 1755)

- [ ] **Step 1: Add the GCal module after `deleteEvent`**

After the `deleteEvent` function and the `event-title` keydown listener (around line 1759), insert:

```js
  // ── Google Calendar integration ───────────────────────────────
  const GCAL_CLIENT_ID = '210732232777-kr357a7pr4s3eb8i7l4k4rtd0fui4hqm.apps.googleusercontent.com';
  const GCAL_API_KEY   = 'AIzaSyAZ0xUx_v7NtV7sYf1y6T1nPIhA0sf8fdQ';
  const GCAL_SCOPE     = 'https://www.googleapis.com/auth/calendar.readonly';

  let gcalTokenClient = null;

  function gcalIsTokenValid() {
    const token  = localStorage.getItem(GCAL_TOKEN_KEY);
    const expiry = parseInt(localStorage.getItem(GCAL_EXPIRY_KEY) || '0', 10);
    return token && Date.now() < expiry;
  }

  function gcalShowConnected() {
    document.getElementById('gcal-connect-row').style.display    = 'none';
    document.getElementById('gcal-connected-row').style.display  = 'flex';
  }

  function gcalShowDisconnected() {
    document.getElementById('gcal-connect-row').style.display    = 'flex';
    document.getElementById('gcal-connected-row').style.display  = 'none';
  }

  function gcalInit() {
    if (typeof google === 'undefined' || !google.accounts) {
      // GIS not loaded yet — retry once after short delay
      setTimeout(gcalInit, 500);
      return;
    }
    gcalTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GCAL_CLIENT_ID,
      scope: GCAL_SCOPE,
      callback: (resp) => {
        if (resp.error) { console.error('GCal auth error:', resp); return; }
        const expiry = Date.now() + (resp.expires_in - 60) * 1000;
        localStorage.setItem(GCAL_TOKEN_KEY, resp.access_token);
        localStorage.setItem(GCAL_EXPIRY_KEY, String(expiry));
        gcalShowConnected();
        gcalFetchToday();
      },
    });
    // Auto-load if valid token already stored
    if (gcalIsTokenValid()) {
      gcalShowConnected();
      gcalFetchToday();
    }
  }

  function gcalConnect() {
    if (!gcalTokenClient) { gcalInit(); setTimeout(gcalConnect, 600); return; }
    gcalTokenClient.requestAccessToken({ prompt: '' });
  }

  function gcalRefresh() {
    if (!gcalTokenClient) { gcalInit(); setTimeout(gcalRefresh, 600); return; }
    gcalTokenClient.requestAccessToken({ prompt: '' });
  }

  function gcalDisconnect() {
    const token = localStorage.getItem(GCAL_TOKEN_KEY);
    if (token && typeof google !== 'undefined') {
      google.accounts.oauth2.revoke(token, () => {});
    }
    localStorage.removeItem(GCAL_TOKEN_KEY);
    localStorage.removeItem(GCAL_EXPIRY_KEY);
    gcalShowDisconnected();
    renderTimeline();
  }

  async function gcalFetchToday() {
    const token = localStorage.getItem(GCAL_TOKEN_KEY);
    if (!token) return;

    const now       = new Date();
    const start     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end       = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`
      + `?key=${GCAL_API_KEY}`
      + `&timeMin=${encodeURIComponent(start.toISOString())}`
      + `&timeMax=${encodeURIComponent(end.toISOString())}`
      + `&singleEvents=true`
      + `&orderBy=startTime`
      + `&maxResults=20`;

    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.status === 401) {
        // Token expired — clear and show connect button
        localStorage.removeItem(GCAL_TOKEN_KEY);
        localStorage.removeItem(GCAL_EXPIRY_KEY);
        gcalShowDisconnected();
        return;
      }
      const data = await resp.json();
      const events = (data.items || []).map(item => {
        const start = item.start.dateTime || item.start.date;
        const d     = new Date(start);
        const time  = item.start.dateTime
          ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'All day';
        return { time, title: item.summary || '(no title)', gcal: true };
      });
      renderTimelineWithGcal(events);
    } catch (err) {
      console.error('GCal fetch error:', err);
    }
  }

  function renderTimelineWithGcal(gcalEvents) {
    const today    = todayKey();
    const local    = load(EVENTS_KEY, []).filter(e => e.date === today);
    const all      = [...local, ...gcalEvents]
      .sort((a, b) => a.time.localeCompare(b.time));
    const line     = document.getElementById('timeline');

    if (!all.length) {
      line.innerHTML = `<div class="timeline-empty">Wide open day.</div>`;
      return;
    }
    line.innerHTML = all.map((e, i) => `
      <div class="timeline-item${e.gcal ? ' gcal-event' : ''}">
        <span class="timeline-time">${escHtml(e.time)}</span>
        <span class="timeline-title">${escHtml(e.title)}</span>
        ${e.gcal ? '' : `<button class="timeline-del" onclick="deleteEvent(${i})" title="Remove">✕</button>`}
      </div>`).join('');
  }
```

- [ ] **Step 2: Commit**

```bash
git -C /home/tonycharlesmoore/chat-app/public add command-center.html
git -C /home/tonycharlesmoore/chat-app/public commit -m "feat: add GCal OAuth module with auto-load and timeline merge"
```

---

### Task 5: Wire gcalInit into page startup

**Files:**
- Modify: `command-center.html` (bottom of script block — the init/startup section)

- [ ] **Step 1: Find the page init call and add gcalInit**

Find the bottom of the `<script>` block where initial render calls happen (look for `renderTimeline()`, `renderHabits()`, etc. being called at startup). Add `gcalInit()` after `renderTimeline()`:

```js
  gcalInit();
```

- [ ] **Step 2: Commit**

```bash
git -C /home/tonycharlesmoore/chat-app/public add command-center.html
git -C /home/tonycharlesmoore/chat-app/public commit -m "feat: wire gcalInit into page startup"
```

---

### Task 6: Remove dead event-listener and addEvent function

**Files:**
- Modify: `command-center.html` (script block — `addEvent`, `deleteEvent`, and the `event-title` keydown listener)

- [ ] **Step 1: Remove the manual-entry event listener**

Find and remove this block (around line 1757):

```js
  document.getElementById('event-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') addEvent();
  });
```

- [ ] **Step 2: Remove the `addEvent` function**

Find and remove the full `addEvent()` function (around lines 1736–1746):

```js
  function addEvent() {
    const time  = document.getElementById('event-time').value.trim();
    const title = document.getElementById('event-title').value.trim();
    if (!title) return;
    const all = load(EVENTS_KEY, []);
    all.push({ date: todayKey(), time: time || '—', title });
    save(EVENTS_KEY, all);
    document.getElementById('event-time').value  = '';
    document.getElementById('event-title').value = '';
    renderTimeline();
  }
```

- [ ] **Step 3: Commit**

```bash
git -C /home/tonycharlesmoore/chat-app/public add command-center.html
git -C /home/tonycharlesmoore/chat-app/public commit -m "chore: remove manual event entry code"
```

---

### Task 7: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git -C /home/tonycharlesmoore/chat-app/public push origin main
```

Expected: `Branch 'main' set up to track remote branch 'main' of 'origin'.`

---
