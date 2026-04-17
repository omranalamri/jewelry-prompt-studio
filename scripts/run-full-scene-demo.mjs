#!/usr/bin/env node
// Full Scene Demo: Ring on hand + Necklace on neck, multiple styles, animate, stitch
const API = 'https://jewelry-prompt-studio.vercel.app';

async function post(endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function main() {
  console.log('=============================================');
  console.log('  FULL SCENE DEMO');
  console.log('  Ring on Hand + Necklace on Neck');
  console.log('=============================================\n');

  // Get a model from the repository
  const modelsRes = await fetch(`${API}/api/models`);
  const modelsData = await modelsRes.json();
  const femaleModel = modelsData.data?.find(m => m.gender === 'female');
  console.log(`Using model: ${femaleModel?.name || 'none'}\n`);

  // Step 1: Generate ring reference
  console.log('Step 1: Generating gold ring reference...');
  const ring = await post('/api/generate/image', {
    prompt: 'Gold solitaire diamond engagement ring, round brilliant cut, 6 prong setting, polished 18k yellow gold band, product photography, white background',
  });
  if (!ring.success) { console.log('FAILED:', ring.error); return; }
  console.log(`  Ring: ${ring.data.resultUrl}\n`);

  // Step 2: Generate necklace reference
  console.log('Step 2: Generating pearl necklace reference...');
  const necklace = await post('/api/generate/image', {
    prompt: 'Elegant pearl strand necklace with gold clasp, 16 inch princess length, perfectly round white pearls, product photography, white background',
  });
  if (!necklace.success) { console.log('FAILED:', necklace.error); return; }
  console.log(`  Necklace: ${necklace.data.resultUrl}\n`);

  // Step 3: Ring campaign — hand scenes
  console.log('Step 3: Ring on Hand campaign (5 scenes)...');
  const ringCampaign = await post('/api/generate/campaign', {
    productImageUrl: ring.data.resultUrl,
    modelImageUrl: femaleModel?.imageUrl || undefined,
    jewelryType: 'ring',
    setting: 'dramatic',
    selectedAngles: ['hand-front', 'hand-close', 'hand-cup', 'flat-lay', 'hero-ring'],
  });
  if (!ringCampaign.success) { console.log('FAILED:', ringCampaign.error); return; }
  console.log(`  ${ringCampaign.data.successCount}/${ringCampaign.data.totalAngles} scenes (${ringCampaign.data.totalCost})`);
  for (const a of ringCampaign.data.angles) {
    console.log(`    ${a.name.padEnd(20)} — ${a.resultUrl ? `${a.timeSeconds}s` : 'FAIL'}`);
  }
  console.log();

  // Step 4: Necklace campaign — neck scenes
  console.log('Step 4: Necklace on Neck campaign (5 scenes)...');
  const neckCampaign = await post('/api/generate/campaign', {
    productImageUrl: necklace.data.resultUrl,
    modelImageUrl: femaleModel?.imageUrl || undefined,
    jewelryType: 'necklace',
    setting: 'lifestyle',
    selectedAngles: ['neck-front', 'neck-side', 'neck-close', 'decollete', 'hero-necklace'],
  });
  if (!neckCampaign.success) { console.log('FAILED:', neckCampaign.error); return; }
  console.log(`  ${neckCampaign.data.successCount}/${neckCampaign.data.totalAngles} scenes (${neckCampaign.data.totalCost})`);
  for (const a of neckCampaign.data.angles) {
    console.log(`    ${a.name.padEnd(20)} — ${a.resultUrl ? `${a.timeSeconds}s` : 'FAIL'}`);
  }
  console.log();

  // Step 5: Animate best 4 (2 ring + 2 necklace)
  const ringFrames = ringCampaign.data.angles.filter(a => a.resultUrl).slice(0, 2);
  const neckFrames = neckCampaign.data.angles.filter(a => a.resultUrl).slice(0, 2);
  const allFrames = [...ringFrames, ...neckFrames];

  console.log(`Step 5: Animating ${allFrames.length} frames with Kling 2.5...`);
  const stitch = await post('/api/generate/stitch', {
    frames: allFrames.map(a => ({
      imageUrl: a.resultUrl,
      label: a.name,
      motion: `Slow elegant camera movement, subtle sparkle on jewelry, gentle golden light play, cinematic luxury commercial`,
    })),
    videoModel: 'kling',
    duration: 5,
  });

  if (!stitch.success) { console.log('FAILED:', stitch.error); return; }
  console.log(`  ${stitch.data.successCount}/${stitch.data.totalFrames} clips (${stitch.data.totalCost}, ${stitch.data.totalTimeSeconds}s)\n`);

  // Final report
  console.log('=============================================');
  console.log('  FULL SCENE DEMO RESULTS');
  console.log('=============================================');
  console.log(`  Model: ${femaleModel?.name || 'none'}`);
  console.log();
  console.log('  RING SCENES:');
  for (const a of ringCampaign.data.angles.filter(a => a.resultUrl)) {
    console.log(`    ${a.name.padEnd(20)} — ${a.resultUrl}`);
  }
  console.log();
  console.log('  NECKLACE SCENES:');
  for (const a of neckCampaign.data.angles.filter(a => a.resultUrl)) {
    console.log(`    ${a.name.padEnd(20)} — ${a.resultUrl}`);
  }
  console.log();
  console.log('  ANIMATED CLIPS:');
  for (const c of stitch.data.clips) {
    if (c.videoUrl) console.log(`    ${c.label.padEnd(20)} — ${c.videoUrl}`);
    else console.log(`    ${c.label.padEnd(20)} — FAILED`);
  }

  const imgCost = parseFloat(ringCampaign.data.totalCost.replace('$','')) + parseFloat(neckCampaign.data.totalCost.replace('$','')) + 0.10;
  const vidCost = parseFloat(stitch.data.totalCost.replace('$',''));
  console.log();
  console.log(`  TOTAL: $${(imgCost + vidCost).toFixed(2)} (${ringCampaign.data.successCount + neckCampaign.data.successCount} images + ${stitch.data.successCount} videos)`);
  console.log('=============================================');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
