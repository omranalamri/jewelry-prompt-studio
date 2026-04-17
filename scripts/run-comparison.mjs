#!/usr/bin/env node
// Pipeline Comparison Test Runner
// Generates 10 jewelry references, then runs both Simple + Full pipelines on each
// Results saved to public/comparison-data.json

import Replicate from 'replicate';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const TOKEN = process.env.REPLICATE_API_TOKEN || (() => {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  const match = env.match(/REPLICATE_API_TOKEN="?([^"\n]+)"?/);
  return match?.[1];
})();

if (!TOKEN) { console.error('No REPLICATE_API_TOKEN'); process.exit(1); }

const replicate = new Replicate({ auth: TOKEN });
const OUTPUT_PATH = resolve(process.cwd(), 'public/comparison-data.json');

// 10 varied jewelry pieces to generate as "customer uploads"
const REFERENCE_PROMPTS = [
  { id: 1, name: 'Gold Solitaire Ring', prompt: 'Gold solitaire diamond engagement ring, professional product photography on pure white background, sharp focus, high detail' },
  { id: 2, name: 'Pearl Necklace', prompt: 'Elegant pearl strand necklace with gold clasp, professional jewelry product shot, white background, every pearl visible' },
  { id: 3, name: 'Diamond Studs', prompt: 'Pair of round brilliant diamond stud earrings in platinum prong setting, macro jewelry photography, white background' },
  { id: 4, name: 'Gold Chain Bracelet', prompt: 'Delicate gold chain bracelet with small heart charm, product photography, white background, fine jewelry detail' },
  { id: 5, name: 'Ruby Pendant', prompt: 'Oval ruby pendant necklace set in yellow gold with diamond halo, professional jewelry photo, white background' },
  { id: 6, name: 'Silver Filigree Bangle', prompt: 'Sterling silver bangle bracelet with intricate filigree scrollwork pattern, product photography, white background' },
  { id: 7, name: 'Emerald Ring', prompt: 'Emerald cut emerald ring with diamond side stones in white gold, professional product shot, white background' },
  { id: 8, name: 'Gold Hoops', prompt: 'Medium gold hoop earrings with pave diamond front, product photography, white background, elegant design' },
  { id: 9, name: 'Vintage Brooch', prompt: 'Vintage art deco pearl and gold brooch with geometric design, antique jewelry photography, white background' },
  { id: 10, name: 'Sapphire Bracelet', prompt: 'Blue sapphire and white gold tennis bracelet, professional jewelry photography, white background, every stone visible' },
];

// Creative direction prompts — what we want each piece to look like
const CREATIVE_DIRECTIONS = [
  'On black velvet display, dramatic side lighting, luxury magazine advertisement, deep shadows, golden highlights',
  'Lifestyle photography worn on elegant model, warm golden hour sunlight, romantic and aspirational',
  'Extreme macro closeup showing every facet and metalwork detail, shallow depth of field, studio lighting',
  'On white marble surface with soft morning window light, editorial style, minimalist elegance',
  'Clean e-commerce product photography, floating on white, even soft box lighting, crisp detail',
  'On vintage mahogany jewelry box, romantic soft-focus background, warm amber tones, candlelight feel',
  'Bold high-contrast advertising shot, dramatic reflections on polished black surface, striking and modern',
  'Evening gala setting on model, glamorous crystal chandelier bokeh, sophisticated lighting',
  'Museum exhibition display on velvet cushion, gallery lighting with spot focus, prestigious presentation',
  'Artistic editorial, piece laid on raw silk fabric, shallow depth of field, dreamy bokeh, warm palette',
];

// State file for resuming
const STATE_PATH = resolve(process.cwd(), 'public/comparison-state.json');

function loadState() {
  if (existsSync(STATE_PATH)) return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  return { references: [], comparisons: [], phase: 'references', lastCompleted: -1 };
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function saveResults(comparisons) {
  writeFileSync(OUTPUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), count: comparisons.length, comparisons }, null, 2));
  console.log(`\n  Results saved to ${OUTPUT_PATH}`);
}

async function generateReference(prompt, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const output = await replicate.run('google/nano-banana-2', {
        input: { prompt, resolution: '1K', aspect_ratio: '1:1', output_format: 'jpg' },
      });
      return Array.isArray(output) ? String(output[0]) : String(output);
    } catch (e) {
      if (attempt === retries) throw e;
      console.log(`    Retry ${attempt + 1}...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

async function runPipeline(referenceUrl, creativePrompt, pipeline) {
  const API_URL = process.env.API_URL || 'https://jewelry-prompt-studio.vercel.app';
  const res = await fetch(`${API_URL}/api/generate/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: creativePrompt,
      referenceImageUrl: referenceUrl,
      pipeline,
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Pipeline failed');
  return json.data;
}

async function main() {
  console.log('==============================================');
  console.log('  PIPELINE COMPARISON: 10 Simple vs 10 Full');
  console.log('==============================================\n');

  const state = loadState();
  const startTime = Date.now();

  // Phase 1: Generate reference images (batches of 3)
  if (state.phase === 'references') {
    console.log('PHASE 1: Generating 10 jewelry reference images...\n');

    for (let i = state.references.length; i < REFERENCE_PROMPTS.length; i += 3) {
      const batch = REFERENCE_PROMPTS.slice(i, i + 3);
      console.log(`  Batch ${Math.floor(i/3) + 1}: Generating ${batch.map(b => b.name).join(', ')}...`);

      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const refStart = Date.now();
          const url = await generateReference(item.prompt);
          const time = ((Date.now() - refStart) / 1000).toFixed(1);
          console.log(`    [${item.id}] ${item.name} — ${time}s`);
          return { ...item, referenceUrl: url, time };
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') state.references.push(r.value);
        else console.error(`    FAILED:`, r.reason?.message?.slice(0, 80));
      }
      saveState(state);
    }

    console.log(`\n  ${state.references.length}/10 references generated.\n`);
    state.phase = 'pipelines';
    saveState(state);
  }

  // Phase 2: Run both pipelines for each reference
  if (state.phase === 'pipelines') {
    console.log('PHASE 2: Running Simple + Full pipelines...\n');

    for (let i = state.comparisons.length; i < state.references.length; i++) {
      const ref = state.references[i];
      const creative = CREATIVE_DIRECTIONS[i % CREATIVE_DIRECTIONS.length];

      console.log(`  [${ref.id}/10] ${ref.name}`);
      console.log(`    Creative: "${creative.slice(0, 60)}..."`);
      console.log(`    Running SIMPLE + FULL in parallel...`);

      const pairStart = Date.now();

      const [simpleResult, fullResult] = await Promise.allSettled([
        runPipeline(ref.referenceUrl, creative, 'simple'),
        runPipeline(ref.referenceUrl, creative, 'full'),
      ]);

      const pairTime = ((Date.now() - pairStart) / 1000).toFixed(1);

      const comparison = {
        id: ref.id,
        name: ref.name,
        referenceUrl: ref.referenceUrl,
        referencePrompt: ref.prompt,
        creativeDirection: creative,
        simple: simpleResult.status === 'fulfilled' ? {
          success: true,
          resultUrl: simpleResult.value.resultUrl,
          model: simpleResult.value.model,
          cost: simpleResult.value.cost,
          costRaw: simpleResult.value.costRaw,
          timeSeconds: simpleResult.value.timeSeconds,
          cleanedImageUrl: simpleResult.value.cleanedImageUrl,
          pipelineSteps: simpleResult.value.pipelineSteps,
        } : { success: false, error: simpleResult.reason?.message },
        full: fullResult.status === 'fulfilled' ? {
          success: true,
          resultUrl: fullResult.value.resultUrl,
          model: fullResult.value.model,
          cost: fullResult.value.cost,
          costRaw: fullResult.value.costRaw,
          timeSeconds: fullResult.value.timeSeconds,
          cleanedImageUrl: fullResult.value.cleanedImageUrl,
          pipelineSteps: fullResult.value.pipelineSteps,
        } : { success: false, error: fullResult.reason?.message },
      };

      const sOk = comparison.simple.success ? `${comparison.simple.timeSeconds}s ${comparison.simple.cost}` : 'FAILED';
      const fOk = comparison.full.success ? `${comparison.full.timeSeconds}s ${comparison.full.cost}` : 'FAILED';
      console.log(`    Simple: ${sOk}  |  Full: ${fOk}  |  Pair: ${pairTime}s\n`);

      state.comparisons.push(comparison);
      saveState(state);
      saveResults(state.comparisons);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  const totalCost = state.comparisons.reduce((sum, c) => {
    return sum + (c.simple.costRaw || 0) + (c.full.costRaw || 0);
  }, 0);

  console.log('==============================================');
  console.log(`  DONE: ${state.comparisons.length} comparisons in ${totalTime}s`);
  console.log(`  Total cost: $${totalCost.toFixed(2)}`);
  console.log(`  Results: ${OUTPUT_PATH}`);
  console.log('==============================================');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
