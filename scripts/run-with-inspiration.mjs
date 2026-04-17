#!/usr/bin/env node
// Rerun comparison with INSPIRATION IMAGES
// For each test: product image + inspiration image (visual style reference) → all 3 pipelines

import Replicate from 'replicate';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const TOKEN = (() => {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  return env.match(/REPLICATE_API_TOKEN="?([^"\n]+)"?/)?.[1];
})();

const replicate = new Replicate({ auth: TOKEN });
const DATA_PATH = resolve(process.cwd(), 'public/comparison-data.json');
const API_URL = 'https://jewelry-prompt-studio.vercel.app';

// Style inspiration prompts — these generate the MOOD/SETTING reference images
// (not jewelry — these show the lighting, surface, atmosphere we want)
const INSPIRATION_PROMPTS = [
  'Black velvet jewelry display surface, dramatic side lighting, deep shadows, warm golden spotlight, luxury store atmosphere, no jewelry',
  'Elegant woman\'s hand resting on marble table, warm golden hour sunlight through window, romantic and aspirational lifestyle, no jewelry visible',
  'Extreme macro photography setup, shallow depth of field, studio ring light reflections, professional jewelry shooting environment',
  'White marble surface with morning window light, minimalist editorial style, soft shadows, fresh flowers in background',
  'Clean white product photography lightbox, perfectly even soft lighting, e-commerce style, pristine surface',
  'Vintage mahogany jewelry box open on antique table, warm candlelight, romantic evening atmosphere, aged patina',
  'Polished black obsidian surface, dramatic high-contrast lighting, bold reflections, modern luxury advertising style',
  'Evening gala table setting, crystal champagne glasses, chandelier bokeh, sophisticated warm ambient light',
  'Museum display case, focused gallery spot lighting, dark velvet cushion, prestigious exhibition atmosphere',
  'Raw silk fabric draped artistically, warm palette, dreamy soft-focus, artistic editorial photography lighting',
];

async function generateImage(prompt) {
  const output = await replicate.run('google/nano-banana-2', {
    input: { prompt, resolution: '1K', aspect_ratio: '1:1', output_format: 'jpg' },
  });
  return Array.isArray(output) ? String(output[0]) : String(output);
}

async function runPipeline(referenceUrl, inspirationUrl, creativePrompt, pipeline) {
  const res = await fetch(`${API_URL}/api/generate/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: creativePrompt,
      referenceImageUrl: referenceUrl,
      inspirationImageUrl: inspirationUrl,
      pipeline,
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || `${pipeline} pipeline failed`);
  return json.data;
}

async function main() {
  console.log('==============================================');
  console.log('  COMPARISON WITH INSPIRATION IMAGES');
  console.log('  Product + Style Reference → 3 Pipelines');
  console.log('==============================================\n');

  // Load existing data (has product reference URLs)
  const existing = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
  const startTime = Date.now();

  // Phase 1: Generate 10 inspiration/style images
  console.log('PHASE 1: Generating 10 style inspiration images...\n');
  const inspirations = [];

  for (let i = 0; i < INSPIRATION_PROMPTS.length; i += 3) {
    const batch = INSPIRATION_PROMPTS.slice(i, i + 3);
    console.log(`  Batch ${Math.floor(i/3) + 1}: generating ${batch.length} inspirations...`);

    const results = await Promise.allSettled(
      batch.map(async (prompt, j) => {
        const url = await generateImage(prompt);
        console.log(`    [${i + j + 1}] done`);
        return url;
      })
    );

    for (const r of results) {
      inspirations.push(r.status === 'fulfilled' ? r.value : null);
    }
  }

  console.log(`\n  ${inspirations.filter(Boolean).length}/10 inspiration images generated.\n`);

  // Phase 2: Run all 3 pipelines for each product + inspiration pair
  console.log('PHASE 2: Running Direct + Simple + Full with inspiration...\n');

  const comparisons = [];
  for (let i = 0; i < existing.comparisons.length; i++) {
    const orig = existing.comparisons[i];
    const inspoUrl = inspirations[i];

    if (!inspoUrl) {
      console.log(`  [${orig.id}] ${orig.name} — skipping (no inspiration image)`);
      comparisons.push(orig);
      continue;
    }

    console.log(`  [${orig.id}] ${orig.name}`);
    console.log(`    Product: ${orig.referenceUrl.slice(0, 60)}...`);
    console.log(`    Inspiration: ${inspoUrl.slice(0, 60)}...`);
    console.log(`    Running 3 pipelines in parallel...`);

    const pairStart = Date.now();

    const [directRes, simpleRes, fullRes] = await Promise.allSettled([
      runPipeline(orig.referenceUrl, inspoUrl, orig.creativeDirection, 'direct'),
      runPipeline(orig.referenceUrl, inspoUrl, orig.creativeDirection, 'simple'),
      runPipeline(orig.referenceUrl, inspoUrl, orig.creativeDirection, 'full'),
    ]);

    const formatResult = (r) => r.status === 'fulfilled'
      ? { success: true, resultUrl: r.value.resultUrl, model: r.value.model, cost: r.value.cost, costRaw: r.value.costRaw, timeSeconds: r.value.timeSeconds, cleanedImageUrl: r.value.cleanedImageUrl, pipelineSteps: r.value.pipelineSteps }
      : { success: false, error: r.reason?.message?.slice(0, 100) };

    const comparison = {
      ...orig,
      inspirationUrl: inspoUrl,
      direct: formatResult(directRes),
      simple: formatResult(simpleRes),
      full: formatResult(fullRes),
    };

    const d = comparison.direct.success ? `${comparison.direct.timeSeconds}s` : 'FAIL';
    const s = comparison.simple.success ? `${comparison.simple.timeSeconds}s` : 'FAIL';
    const f = comparison.full.success ? `${comparison.full.timeSeconds}s` : 'FAIL';
    console.log(`    Direct: ${d} | Simple: ${s} | Full: ${f} | ${((Date.now() - pairStart)/1000).toFixed(0)}s\n`);

    comparisons.push(comparison);

    // Save progress after each
    writeFileSync(DATA_PATH, JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: comparisons.length,
      hasInspirationImages: true,
      comparisons,
    }, null, 2));
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  console.log('==============================================');
  console.log(`  DONE in ${totalTime}s`);
  console.log(`  Results: ${DATA_PATH}`);
  console.log('==============================================');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
