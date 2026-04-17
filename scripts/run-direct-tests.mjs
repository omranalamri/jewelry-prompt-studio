#!/usr/bin/env node
// Add Direct pipeline results to existing comparison data
// Reads public/comparison-data.json, runs direct pipeline for each reference, updates the file

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const DATA_PATH = resolve(process.cwd(), 'public/comparison-data.json');
const API_URL = 'https://jewelry-prompt-studio.vercel.app';

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
console.log(`Loaded ${data.comparisons.length} existing comparisons\n`);

async function runDirect(referenceUrl, creativePrompt) {
  const res = await fetch(`${API_URL}/api/generate/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: creativePrompt,
      referenceImageUrl: referenceUrl,
      pipeline: 'direct',
    }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Direct pipeline failed');
  return json.data;
}

async function main() {
  console.log('Running DIRECT pipeline (Raw image → NB2) for all 10 references...\n');
  const startTime = Date.now();

  // Run in batches of 2 to avoid rate limits
  for (let i = 0; i < data.comparisons.length; i += 2) {
    const batch = data.comparisons.slice(i, i + 2);

    const results = await Promise.allSettled(
      batch.map(async (comp) => {
        const pairStart = Date.now();
        console.log(`  [${comp.id}/10] ${comp.name} — running direct...`);

        try {
          const result = await runDirect(comp.referenceUrl, comp.creativeDirection);
          const elapsed = ((Date.now() - pairStart) / 1000).toFixed(1);
          console.log(`    SUCCESS: ${result.timeSeconds}s ${result.cost} (${elapsed}s wall)`);
          return {
            id: comp.id,
            direct: {
              success: true,
              resultUrl: result.resultUrl,
              model: result.model,
              cost: result.cost,
              costRaw: result.costRaw,
              timeSeconds: result.timeSeconds,
              cleanedImageUrl: result.cleanedImageUrl,
              pipelineSteps: result.pipelineSteps,
            },
          };
        } catch (e) {
          console.log(`    FAILED: ${e.message?.slice(0, 80)}`);
          return {
            id: comp.id,
            direct: { success: false, error: e.message },
          };
        }
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        const comp = data.comparisons.find(c => c.id === r.value.id);
        if (comp) comp.direct = r.value.direct;
      }
    }

    // Save after each batch
    data.generatedAt = new Date().toISOString();
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log('  (saved)\n');
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);
  const directOk = data.comparisons.filter(c => c.direct?.success).length;
  const directCost = data.comparisons.reduce((s, c) => s + (c.direct?.costRaw || 0), 0);

  console.log('==========================================');
  console.log(`  DIRECT TESTS DONE: ${directOk}/10 succeeded`);
  console.log(`  Time: ${totalTime}s  |  Cost: $${directCost.toFixed(2)}`);
  console.log('==========================================');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
