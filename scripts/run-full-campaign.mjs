#!/usr/bin/env node
// Full Campaign Pipeline: Generate 9 angles → Animate top 3 → Report

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
  console.log('  FULL CAMPAIGN PIPELINE');
  console.log('=============================================\n');

  // Step 1: Generate reference ring
  console.log('Step 1: Generating reference ring...');
  const ref = await post('/api/generate/image', {
    prompt: 'Gold solitaire diamond engagement ring, round brilliant cut, 6 prong setting, polished 18k yellow gold band, professional jewelry product photography, pure white background, sharp focus',
  });
  if (!ref.success) { console.log('FAILED:', ref.error); return; }
  const ringUrl = ref.data.resultUrl;
  console.log(`  Ring: ${ringUrl}\n`);

  // Step 2: Generate inspiration mood
  console.log('Step 2: Generating inspiration mood...');
  const inspo = await post('/api/generate/image', {
    prompt: 'Luxury jewelry photography studio, black velvet display, dramatic golden spotlight, deep shadows, warm highlights, premium atmosphere, no jewelry',
  });
  if (!inspo.success) { console.log('FAILED:', inspo.error); return; }
  const inspoUrl = inspo.data.resultUrl;
  console.log(`  Inspiration: ${inspoUrl}\n`);

  // Step 3: Full 9-angle campaign
  console.log('Step 3: Generating 9-angle campaign...');
  const campaign = await post('/api/generate/campaign', {
    productImageUrl: ringUrl,
    inspirationImageUrl: inspoUrl,
    jewelryType: 'ring',
    setting: 'dramatic',
    customPrompt: 'Elegant gold solitaire diamond ring, warm golden tones, luxury feel',
  });
  if (!campaign.success) { console.log('FAILED:', campaign.error); return; }

  const angles = campaign.data.angles;
  const successAngles = angles.filter(a => a.resultUrl);
  console.log(`  ${campaign.data.successCount}/${campaign.data.totalAngles} angles (${campaign.data.totalCost}, ${campaign.data.totalTimeSeconds}s)`);
  for (const a of angles) {
    const s = a.resultUrl ? `${a.timeSeconds}s` : `FAIL`;
    console.log(`    ${a.name.padEnd(20)} (${a.angle.padEnd(5)}) — ${s}`);
  }
  console.log();

  // Step 4: Animate top 3 with Kling 2.5
  const toAnimate = successAngles.slice(0, 3);
  console.log(`Step 4: Animating ${toAnimate.length} frames with Kling 2.5...`);

  const stitch = await post('/api/generate/stitch', {
    frames: toAnimate.map(a => ({
      imageUrl: a.resultUrl,
      label: a.name,
      motion: `Slow elegant camera movement showing ${a.name.toLowerCase()} of gold ring, subtle sparkle on diamond, gentle light play, cinematic jewelry commercial`,
    })),
    videoModel: 'kling',
    duration: 5,
  });

  if (!stitch.success) { console.log('FAILED:', stitch.error); return; }

  console.log(`  ${stitch.data.successCount}/${stitch.data.totalFrames} clips (${stitch.data.totalCost}, ${stitch.data.totalTimeSeconds}s)\n`);

  // Final report
  console.log('=============================================');
  console.log('  CAMPAIGN RESULTS');
  console.log('=============================================');
  console.log(`  Product:     ${ringUrl}`);
  console.log(`  Inspiration: ${inspoUrl}`);
  console.log();
  console.log('  IMAGES (9 angles):');
  for (const a of successAngles) {
    console.log(`    ${a.name.padEnd(20)} — ${a.resultUrl}`);
  }
  console.log();
  console.log('  VIDEOS (animated clips):');
  for (const c of stitch.data.clips) {
    if (c.videoUrl) {
      console.log(`    ${c.label.padEnd(20)} — ${c.videoUrl}`);
    } else {
      console.log(`    ${c.label.padEnd(20)} — FAILED: ${c.error}`);
    }
  }

  const totalImgCost = parseFloat(campaign.data.totalCost.replace('$', '')) || 0;
  const totalVidCost = parseFloat(stitch.data.totalCost.replace('$', '')) || 0;
  const refCost = 0.05 + 0.05; // ref + inspo generation
  console.log();
  console.log(`  TOTAL COST: $${(refCost + totalImgCost + totalVidCost).toFixed(2)}`);
  console.log(`  Images: ${campaign.data.successCount} | Videos: ${stitch.data.successCount}`);
  console.log('=============================================');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
