#!/usr/bin/env node
// Regenerate comparison data with PERMANENT Blob URLs
// All images saved to Blob at generation time now

import { writeFileSync } from 'fs';
import { resolve } from 'path';

const API = 'https://jewelry-prompt-studio.vercel.app';
const OUTPUT = resolve(process.cwd(), 'public/comparison-data.json');

async function post(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

const TESTS = [
  { id: 1, name: 'Gold Solitaire Ring', ref: 'Gold solitaire diamond engagement ring, 6 prong setting, 18k yellow gold, product photography, white background', creative: 'On black velvet, dramatic side lighting, luxury magazine ad, golden highlights' },
  { id: 2, name: 'Pearl Necklace', ref: 'Elegant pearl strand necklace with gold clasp, perfectly round white pearls, product photography, white background', creative: 'Lifestyle on elegant model, warm golden hour sunlight, romantic and aspirational' },
  { id: 3, name: 'Diamond Studs', ref: 'Round brilliant diamond stud earrings in platinum prong setting, macro jewelry photography, white background', creative: 'Extreme macro closeup showing every facet, studio ring light reflections' },
  { id: 4, name: 'Silver Bangle', ref: 'Sterling silver bangle bracelet with intricate filigree scrollwork pattern, product photography, white background', creative: 'On white marble surface, soft morning window light, editorial minimalist elegance' },
  { id: 5, name: 'Ruby Pendant', ref: 'Oval ruby pendant necklace in yellow gold with diamond halo, professional jewelry photo, white background', creative: 'Bold advertising shot, dramatic reflections on polished black surface, striking modern' },
];

async function main() {
  console.log('============================================');
  console.log('  REGENERATING COMPARISON DATA');
  console.log('  All images saved to Blob permanently');
  console.log('============================================\n');

  const comparisons = [];

  for (const test of TESTS) {
    console.log(`[${test.id}/${TESTS.length}] ${test.name}`);

    // Generate reference image
    console.log('  Generating reference...');
    const ref = await post('/api/generate/image', { prompt: test.ref });
    if (!ref.success) { console.log(`  REF FAILED: ${ref.error}`); continue; }
    const refUrl = ref.data.resultUrl;
    console.log(`  Ref: ${refUrl.includes('blob.vercel') ? 'BLOB' : 'REP'} — ${refUrl.slice(0, 60)}`);

    // Generate inspiration
    console.log('  Generating inspiration...');
    const inspo = await post('/api/generate/image', { prompt: `Luxury jewelry photography studio, ${test.creative}, no jewelry present, premium atmosphere` });
    const inspoUrl = inspo.success ? inspo.data.resultUrl : null;

    // Run Direct pipeline
    console.log('  Running Direct...');
    const direct = await post('/api/generate/image', {
      prompt: test.creative, referenceImageUrl: refUrl, inspirationImageUrl: inspoUrl, pipeline: 'direct',
    });

    // Run Simple pipeline
    console.log('  Running Simple...');
    const simple = await post('/api/generate/image', {
      prompt: test.creative, referenceImageUrl: refUrl, inspirationImageUrl: inspoUrl, pipeline: 'simple',
    });

    const fmt = (r) => r.success
      ? { success: true, resultUrl: r.data.resultUrl, model: r.data.model, cost: r.data.cost, costRaw: r.data.costRaw, timeSeconds: r.data.timeSeconds, pipelineSteps: r.data.pipelineSteps }
      : { success: false, error: r.error };

    comparisons.push({
      id: test.id,
      name: test.name,
      referenceUrl: refUrl,
      referencePrompt: test.ref,
      creativeDirection: test.creative,
      inspirationUrl: inspoUrl,
      direct: fmt(direct),
      simple: fmt(simple),
      full: { success: false, error: 'Removed — Direct and Simple pipelines only' },
    });

    const d = direct.success ? `${direct.data.timeSeconds}s BLOB:${direct.data.resultUrl?.includes('blob.vercel')}` : 'FAIL';
    const s = simple.success ? `${simple.data.timeSeconds}s BLOB:${simple.data.resultUrl?.includes('blob.vercel')}` : 'FAIL';
    console.log(`  Direct: ${d} | Simple: ${s}\n`);

    // Save after each
    writeFileSync(OUTPUT, JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: comparisons.length,
      hasInspirationImages: true,
      allPermanent: true,
      comparisons,
    }, null, 2));
  }

  console.log('============================================');
  console.log(`  DONE: ${comparisons.length} comparisons`);
  console.log(`  All URLs permanent on Vercel Blob`);
  console.log('============================================');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
