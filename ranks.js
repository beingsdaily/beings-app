/**
 * ranks.js — Beings Leveling System
 * Include as <script src="ranks.js"></script>
 * Then call BeingsRanks.init('mount-element-id') on page load.
 */
(function (global) {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // RANK DEFINITIONS  (order: 0 = lowest, 5 = highest)
  // ─────────────────────────────────────────────────────────────
  var RANKS_ASC = [
    {
      id: 'E', name: 'Awakening', order: 0,
      color: '#8a9199', glow: 'rgba(138,145,153,0.55)',
      req: { reflections: 0,   journal: 0,  insights: 0 },
    },
    {
      id: 'D', name: 'Seeker',    order: 1,
      color: '#7a9e7e', glow: 'rgba(122,158,126,0.65)',
      req: { reflections: 7,   journal: 0,  insights: 0 },
    },
    {
      id: 'C', name: 'Aware',     order: 2,
      color: '#2dd4bf', glow: 'rgba(45,212,191,0.65)',
      req: { reflections: 21,  journal: 1,  insights: 0 },
    },
    {
      id: 'B', name: 'Grounded',  order: 3,
      color: '#b9a9cc', glow: 'rgba(185,169,204,0.7)',
      req: { reflections: 50,  journal: 0,  insights: 1 },
    },
    {
      id: 'A', name: 'Whole',     order: 4,
      color: '#c4a24a', glow: 'rgba(196,162,74,0.7)',
      req: { reflections: 100, journal: 30, insights: 0 },
    },
    {
      id: 'S', name: 'Being',     order: 5,
      color: '#e8e0d0', glow: 'rgba(232,224,208,0.9)',
      req: { reflections: 365, journal: 0,  insights: 0 },
    },
  ];

  // ─────────────────────────────────────────────────────────────
  // STORAGE KEYS
  // ─────────────────────────────────────────────────────────────
  var LS_HABITS   = 'beings_habit_data';      // tracker.html
  var LS_JOURNAL  = 'beings_journal_v1';       // journal.html
  var LS_INSIGHTS = 'beings_insights_viewed';  // count of weekly insight views
  var LS_RANK     = 'beings_current_rank';     // last known rank id

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────
  function readJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // METRICS
  // ─────────────────────────────────────────────────────────────
  function getMetrics() {
    // Collect unique reflection dates from BOTH sources:
    //   1. beings_habit_data  — { "YYYY-MM-DD": { reflection: true, … } }
    //   2. beings_response_YYYY-MM-DD keys — index.html daily reflections
    var reflDates = {};

    var habitData = readJSON(LS_HABITS, {});
    Object.keys(habitData).forEach(function (date) {
      if (habitData[date] && habitData[date].reflection) {
        reflDates[date] = true;
      }
    });

    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('beings_response_') === 0) {
        var dateStr = k.replace('beings_response_', '');
        reflDates[dateStr] = true;
      }
    }

    var reflections = Object.keys(reflDates).length;

    var journal  = readJSON(LS_JOURNAL, []);
    var jCount   = Array.isArray(journal) ? journal.length : 0;

    var insights = parseInt(localStorage.getItem(LS_INSIGHTS) || '0', 10);

    return { reflections: reflections, journal: jCount, insights: insights };
  }

  // ─────────────────────────────────────────────────────────────
  // RANK CALCULATION
  // ─────────────────────────────────────────────────────────────
  function calcRank(metrics) {
    var current = RANKS_ASC[0];
    for (var i = 0; i < RANKS_ASC.length; i++) {
      var r = RANKS_ASC[i];
      if (
        metrics.reflections >= r.req.reflections &&
        metrics.journal     >= (r.req.journal  || 0) &&
        metrics.insights    >= (r.req.insights || 0)
      ) {
        current = r;
      }
    }
    return current;
  }

  function getNextRank(current) {
    for (var i = 0; i < RANKS_ASC.length; i++) {
      if (RANKS_ASC[i].id === current.id && i < RANKS_ASC.length - 1) {
        return RANKS_ASC[i + 1];
      }
    }
    return null;
  }

  function getProgress() {
    var metrics = getMetrics();
    var current = calcRank(metrics);
    var next    = getNextRank(current);

    var pct   = 100;
    var label = '';

    if (next) {
      var curReq  = current.req.reflections;
      var nextReq = next.req.reflections;
      var span    = nextReq - curReq || 1;
      pct   = Math.min(100, Math.round(((metrics.reflections - curReq) / span) * 100));
      label = metrics.reflections + ' / ' + nextReq + ' reflections to ' + next.id + '-Rank';
    } else {
      pct   = 100;
      label = metrics.reflections + ' reflections · Max rank achieved';
    }

    return { metrics: metrics, current: current, next: next, pct: pct, label: label };
  }

  // ─────────────────────────────────────────────────────────────
  // RECORD INSIGHT VIEW (call from journal.html weekly insights)
  // ─────────────────────────────────────────────────────────────
  function recordInsightView() {
    var n = parseInt(localStorage.getItem(LS_INSIGHTS) || '0', 10) + 1;
    localStorage.setItem(LS_INSIGHTS, String(n));
  }

  // ─────────────────────────────────────────────────────────────
  // STYLES
  // ─────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('beings-rank-styles')) return;
    var style = document.createElement('style');
    style.id = 'beings-rank-styles';
    style.textContent = [
      /* ── Badge ── */
      '.br-badge{display:inline-flex;flex-direction:column;align-items:center;',
      'background:#060d0d;border:1px solid rgba(255,255,255,0.07);',
      'padding:0.42rem 0.65rem 0.36rem;gap:0.18rem;cursor:default;',
      'min-width:54px;position:relative;transition:border-color 0.3s;}',

      '.br-badge:hover{border-color:rgba(255,255,255,0.15);}',

      '.br-letter{font-family:"Cormorant Garamond",serif;font-size:1.3rem;',
      'font-weight:400;line-height:1;letter-spacing:0.04em;',
      'color:var(--br-color);',
      'text-shadow:0 0 10px var(--br-glow),0 0 22px var(--br-glow);}',

      '.br-name{font-family:"Inter",sans-serif;font-size:0.46rem;',
      'font-weight:400;letter-spacing:0.22em;text-transform:uppercase;',
      'color:var(--br-color);opacity:0.7;}',

      '.br-bar{width:100%;height:2px;background:rgba(255,255,255,0.06);',
      'border-radius:1px;overflow:hidden;margin-top:0.22rem;}',

      '.br-bar-fill{height:100%;border-radius:1px;',
      'background:var(--br-color);',
      'box-shadow:0 0 5px var(--br-glow);',
      'transition:width 0.8s cubic-bezier(0.4,0,0.2,1);}',

      /* ── Level-up overlay ── */
      '.br-overlay{position:fixed;inset:0;z-index:99999;',
      'background:rgba(3,8,8,0.97);',
      'display:flex;flex-direction:column;align-items:center;',
      'justify-content:center;gap:1.2rem;cursor:pointer;',
      'animation:br-overlay-in 0.5s ease both;}',

      '@keyframes br-overlay-in{from{opacity:0}to{opacity:1}}',

      '.br-lup-label{font-family:"Inter",sans-serif;',
      'font-size:clamp(0.6rem,2vw,0.75rem);font-weight:400;',
      'letter-spacing:0.55em;text-transform:uppercase;',
      'color:rgba(255,255,255,0.4);',
      'animation:br-rise 0.5s 0.3s both ease;}',

      '.br-lup-letter{font-family:"Cormorant Garamond",serif;',
      'font-size:clamp(5.5rem,20vw,10rem);font-weight:300;line-height:1;',
      'letter-spacing:0.04em;color:var(--br-color);',
      'text-shadow:0 0 40px var(--br-glow),0 0 100px var(--br-glow),0 0 160px var(--br-glow);',
      'animation:br-letter-in 0.7s 0.5s both cubic-bezier(0.34,1.56,0.64,1),',
      'br-letter-pulse 2.5s 1.5s ease-in-out infinite;}',

      '@keyframes br-letter-in{from{opacity:0;transform:scale(0.15) rotate(-8deg)}',
      'to{opacity:1;transform:scale(1) rotate(0deg)}}',

      '@keyframes br-letter-pulse{',
      '0%,100%{text-shadow:0 0 40px var(--br-glow),0 0 100px var(--br-glow)}',
      '50%{text-shadow:0 0 60px var(--br-glow),0 0 140px var(--br-glow),0 0 220px var(--br-glow)}}',

      '.br-lup-name{font-family:"Cormorant Garamond",serif;',
      'font-size:clamp(1.1rem,3.5vw,1.7rem);font-weight:300;',
      'letter-spacing:0.25em;text-transform:uppercase;color:var(--br-color);',
      'animation:br-rise 0.5s 0.9s both ease;}',

      '.br-lup-rule{width:48px;height:1px;background:var(--br-color);opacity:0.3;',
      'animation:br-rise 0.5s 1.1s both ease;}',

      '.br-lup-dismiss{font-family:"Inter",sans-serif;font-size:0.58rem;',
      'letter-spacing:0.32em;text-transform:uppercase;',
      'color:rgba(255,255,255,0.2);',
      'animation:br-rise 0.5s 1.5s both ease;}',

      '.br-rays{position:absolute;width:500px;height:500px;border-radius:50%;',
      'background:radial-gradient(ellipse at center,var(--br-glow) 0%,transparent 68%);',
      'opacity:0.1;pointer-events:none;',
      'animation:br-rays-pulse 2.5s 1.5s ease-in-out infinite;}',

      '@keyframes br-rays-pulse{',
      '0%,100%{transform:scale(0.85);opacity:0.08}',
      '50%{transform:scale(1.15);opacity:0.16}}',

      '@keyframes br-rise{from{opacity:0;transform:translateY(12px)}',
      'to{opacity:1;transform:translateY(0)}}',
    ].join('');
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER BADGE
  // ─────────────────────────────────────────────────────────────
  function renderBadge(mountId) {
    injectStyles();
    var mount = document.getElementById(mountId);
    if (!mount) return;

    var prog    = getProgress();
    var current = prog.current;

    mount.innerHTML =
      '<div class="br-badge" title="' + prog.label + '" ' +
      'style="--br-color:' + current.color + ';--br-glow:' + current.glow + '">' +
      '<div class="br-letter">' + current.id + '</div>' +
      '<div class="br-name">' + current.name + '</div>' +
      '<div class="br-bar"><div class="br-bar-fill" style="width:' + prog.pct + '%"></div></div>' +
      '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // LEVEL-UP NOTIFICATION
  // ─────────────────────────────────────────────────────────────
  function showLevelUp(newRank) {
    injectStyles();

    var overlay = document.createElement('div');
    overlay.className = 'br-overlay';
    overlay.style.cssText =
      '--br-color:' + newRank.color + ';--br-glow:' + newRank.glow;

    overlay.innerHTML =
      '<div class="br-rays"></div>' +
      '<div class="br-lup-label">Rank Up</div>' +
      '<div class="br-lup-letter">' + newRank.id + '</div>' +
      '<div class="br-lup-name">' + newRank.name + '</div>' +
      '<div class="br-lup-rule"></div>' +
      '<div class="br-lup-dismiss">Tap anywhere to continue</div>';

    overlay.addEventListener('click', function () { overlay.remove(); });
    document.body.appendChild(overlay);
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 6000);
  }

  // ─────────────────────────────────────────────────────────────
  // CHECK LEVEL UP
  // ─────────────────────────────────────────────────────────────
  function checkLevelUp() {
    var prog    = getProgress();
    var current = prog.current;
    var stored  = localStorage.getItem(LS_RANK);

    if (!stored) {
      localStorage.setItem(LS_RANK, current.id);
      return;
    }

    var storedRank = RANKS_ASC[0];
    for (var i = 0; i < RANKS_ASC.length; i++) {
      if (RANKS_ASC[i].id === stored) { storedRank = RANKS_ASC[i]; break; }
    }

    if (current.order > storedRank.order) {
      localStorage.setItem(LS_RANK, current.id);
      showLevelUp(current);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // INIT — call this from each page
  // ─────────────────────────────────────────────────────────────
  function init(mountId) {
    injectStyles();
    renderBadge(mountId);
    checkLevelUp();
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────
  global.BeingsRanks = {
    RANKS_ASC        : RANKS_ASC,
    getMetrics       : getMetrics,
    getProgress      : getProgress,
    calcRank         : calcRank,
    recordInsightView: recordInsightView,
    renderBadge      : renderBadge,
    showLevelUp      : showLevelUp,
    checkLevelUp     : checkLevelUp,
    init             : init,
  };

})(window);
