#!/usr/bin/env node
// Run with: node scripts/fetch-oeis-cache.mjs
// Saves OEIS data to src/data/oeis-cache.json for use as build fallback

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const AUTHOR = 'Vincenzo Manto';
const TIMEOUT_MS = 15000;
const OUT_PATH = join(dirname(fileURLToPath(import.meta.url)), '../src/data/oeis-cache.json');

async function fetchPage(baseUrl, start) {
  const url = `${baseUrl}&start=${start}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; personal-site-builder/1.0)' },
  });
  if (!res.ok) throw new Error(`OEIS returned ${res.status} for start=${start}`);
  return res.json();
}

async function fetchAll() {
  const baseUrl = `https://oeis.org/search?q=author:%22${encodeURIComponent(AUTHOR)}%22&fmt=json`;
  let all = [];
  let i = 0;
  while (true) {
    const page = await fetchPage(baseUrl, i++ * 10);
    if (!page || page.length === 0) break;
    all = all.concat(page);
    if (page.length < 10) break;
  }
  return all;
}

const data = await fetchAll();
writeFileSync(OUT_PATH, JSON.stringify(data, null, 2));
console.log(`Saved ${data.length} sequences to ${OUT_PATH}`);
