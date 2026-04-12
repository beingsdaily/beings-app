#!/usr/bin/env node
/**
 * Beings Daily Content Pipeline
 * ─────────────────────────────
 * 1. Fetches Reddit posts about emotional healing / wholeness
 * 2. Passes insights to Claude with Beings brand voice
 * 3. Saves 3 generated X posts to beings-queue.json
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node beings-pipeline.js
 *
 * Or set the key in beings-config.json (see README below).
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE  = join(__dirname, 'beings-queue.json');
const CONFIG_FILE = join(__dirname, 'beings-config.json');
const LOG_FILE    = join(__dirname, 'beings-pipeline.log');

// ── Config ─────────────────────────────────────────────────────────────────

function getApiKey() {
  // 1. Environment variable (preferred for automation)
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  // 2. beings-config.json
  if (existsSync(CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(readFileSync(CONFIG_FILE, 'utf8'));
      if (cfg.anthropic_api_key) return cfg.anthropic_api_key;
    } catch {}
  }
  return null;
}

// ── Logging ─────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    const existing = existsSync(LOG_FILE) ? readFileSync(LOG_FILE, 'utf8') : '';
    const lines = existing.split('\n').filter(Boolean);
    // Keep last 200 log lines
    lines.push(line);
    writeFileSync(LOG_FILE, lines.slice(-200).join('\n') + '\n');
  } catch {}
}

// ── Step 1: Reddit ──────────────────────────────────────────────────────────

const SEARCH_QUERY = 'emotional healing wholeness self-compassion presence';
const REDDIT_SEARCH = `https://www.reddit.com/search.json?q=${encodeURIComponent(SEARCH_QUERY)}&sort=top&t=week&limit=25&raw_json=1`;

async function fetchReddit() {
  log('Fetching Reddit search results…');

  const res = await fetch(REDDIT_SEARCH, {
    headers: { 'User-Agent': 'BeingsBot/1.0 (beings-app content pipeline)' }
  });

  if (!res.ok) throw new Error(`Reddit search failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const posts = data.data.children
    .map(c => c.data)
    .filter(p => p.score > 5 && p.title && !p.over_18);

  log(`Found ${posts.length} qualifying posts`);

  // Also grab top posts from the most-mentioned subreddit for deeper signal
  const subCounts = {};
  posts.forEach(p => { subCounts[p.subreddit] = (subCounts[p.subreddit] || 0) + 1; });
  const topSub = Object.entries(subCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  let topSubPosts = [];
  if (topSub) {
    log(`Fetching top posts from r/${topSub}…`);
    try {
      const subRes = await fetch(
        `https://www.reddit.com/r/${topSub}/top.json?t=week&limit=10&raw_json=1`,
        { headers: { 'User-Agent': 'BeingsBot/1.0' } }
      );
      if (subRes.ok) {
        const subData = await subRes.json();
        topSubPosts = subData.data.children
          .map(c => c.data)
          .filter(p => p.score > 10);
        log(`Got ${topSubPosts.length} top posts from r/${topSub}`);
      }
    } catch (e) {
      log(`Subreddit fetch skipped: ${e.message}`);
    }
  }

  // Merge, deduplicate, take top 20
  const all = [...posts, ...topSubPosts];
  const seen = new Set();
  const unique = all.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  return unique
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

// ── Step 2: Claude → 3 X Posts ──────────────────────────────────────────────

async function generatePosts(redditPosts, apiKey) {
  log('Calling Claude API to generate X posts…');

  const snippets = redditPosts
    .map(p => `[r/${p.subreddit} ↑${p.score}] ${p.title}`)
    .join('\n');

  const prompt = `You are the voice of Beings — a daily reflection app rooted in one belief: people are already whole. Nothing is missing.

Your tone is: quiet, warm, grounded, never preachy. You speak like a trusted friend who has done deep inner work. You don't push or motivate — you remind.

Here are today's signals from communities exploring emotional healing and inner growth on Reddit:

${snippets}

Using these as inspiration (not as sources to quote or reference directly), write exactly 3 original X (Twitter) posts for the @BeingsDaily account. Each post should feel like something a person might read and quietly exhale — a small truth that lands without effort.

Rules:
- Each post must be under 280 characters (count carefully)
- Rooted in the belief that the person reading is already whole
- No hashtags, no emojis, no exclamation marks
- No "you should" or "try to" — speak from a place of already knowing
- Each post should feel complete on its own — a small truth, not a call to action
- Vary the style: one reflective, one gentle provocation, one quiet observation
- Draw from the emotional themes present in the Reddit data, but never mention Reddit

Return ONLY a JSON array with exactly 3 strings, no other text:
["post one text here","post two text here","post three text here"]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude API error ${res.status}: ${err?.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text?.trim() || '';

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse JSON array from Claude response');

  const posts = JSON.parse(match[0]);
  if (!Array.isArray(posts) || posts.length < 1) throw new Error('Unexpected response format');

  return posts.slice(0, 3);
}

// ── Step 3: Save to Queue ────────────────────────────────────────────────────

function saveToQueue(posts, redditMetadata) {
  log(`Saving ${posts.length} posts to queue…`);

  let queue = [];
  if (existsSync(QUEUE_FILE)) {
    try { queue = JSON.parse(readFileSync(QUEUE_FILE, 'utf8')); } catch {}
  }

  const newEntries = posts.map((text, i) => ({
    id: `${Date.now()}-${i}`,
    text: text.trim(),
    generated_at: new Date().toISOString(),
    source: 'beings-pipeline',
    reddit_context: {
      query: SEARCH_QUERY,
      top_subreddits: [...new Set(redditMetadata.map(p => p.subreddit))].slice(0, 5),
      post_count: redditMetadata.length
    },
    status: 'pending'
  }));

  queue.push(...newEntries);
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));

  log(`Queue now has ${queue.length} total posts (${queue.filter(p => p.status === 'pending').length} pending)`);
  return newEntries;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  log('═══ Beings Pipeline starting ═══');

  const apiKey = getApiKey();
  if (!apiKey || !apiKey.startsWith('sk-ant-')) {
    log('ERROR: No valid ANTHROPIC_API_KEY found.');
    log('  Set it as an environment variable: ANTHROPIC_API_KEY=sk-ant-...');
    log('  Or add it to beings-config.json: { "anthropic_api_key": "sk-ant-..." }');
    process.exit(1);
  }

  try {
    // Step 1: Reddit
    const redditPosts = await fetchReddit();
    if (redditPosts.length === 0) {
      log('WARNING: No Reddit posts found. Generating from evergreen themes instead.');
    }

    // Step 2: Claude
    const posts = await generatePosts(redditPosts, apiKey);
    log(`Generated ${posts.length} posts`);
    posts.forEach((p, i) => log(`  Post ${i + 1}: "${p.slice(0, 70)}…"`));

    // Step 3: Queue
    const entries = saveToQueue(posts, redditPosts);

    log('═══ Pipeline complete ═══');
    return { success: true, posts: entries };

  } catch (err) {
    log(`FATAL: ${err.message}`);
    process.exit(1);
  }
}

run();
