#!/usr/bin/env node
// Generate 30 diverse jewelry product images via Gemini 3.1 Flash
// Save to repository + track costs

const API = 'https://jewelry-prompt-studio.vercel.app';

const PRODUCTS = [
  // Rings (6)
  { title: 'Gold Solitaire Diamond Ring', prompt: 'Gold solitaire diamond engagement ring, round brilliant cut, 6 prong setting, 18k yellow gold band, on black velvet, dramatic side lighting, luxury jewelry photography', tags: ['ring', 'gold', 'diamond'] },
  { title: 'Rose Gold Halo Ring', prompt: 'Rose gold halo engagement ring, cushion cut center diamond surrounded by pave diamonds, on white marble surface, soft morning light, editorial style', tags: ['ring', 'rose-gold', 'diamond'] },
  { title: 'Platinum Eternity Band', prompt: 'Platinum eternity band with channel-set diamonds all around, on dark grey velvet, studio lighting, product photography', tags: ['ring', 'platinum', 'diamond'] },
  { title: 'Emerald Cocktail Ring', prompt: 'Large emerald cut emerald cocktail ring in yellow gold with diamond accents, on model hand holding champagne glass, lifestyle photography, warm ambient light', tags: ['ring', 'gold', 'emerald'] },
  { title: 'Sapphire Three-Stone Ring', prompt: 'Blue sapphire three-stone ring with diamond side stones in white gold, on navy velvet, dramatic spotlight, luxury advertising', tags: ['ring', 'white-gold', 'sapphire'] },
  { title: 'Vintage Art Deco Ring', prompt: 'Vintage art deco ring with geometric pattern, diamonds and onyx in platinum, on aged leather surface, warm antique lighting', tags: ['ring', 'platinum', 'vintage'] },
  // Necklaces (6)
  { title: 'Pearl Strand Necklace', prompt: 'Classic pearl strand necklace, perfectly round white Akoya pearls with gold clasp, laid flat on black velvet in elegant curve, dramatic spotlight', tags: ['necklace', 'pearl', 'gold'] },
  { title: 'Diamond Solitaire Pendant', prompt: 'Solitaire diamond pendant on delicate white gold chain, worn on elegant neck, frontal portrait, soft studio lighting', tags: ['necklace', 'white-gold', 'diamond'] },
  { title: 'Gold Layered Chain Set', prompt: 'Set of three layered gold chains of different lengths and styles, worn together on model decollete, lifestyle warm golden hour light', tags: ['necklace', 'gold', 'layered'] },
  { title: 'Ruby Heart Pendant', prompt: 'Heart-shaped ruby pendant in yellow gold with diamond bail, on red silk fabric, romantic soft lighting, Valentine luxury', tags: ['necklace', 'gold', 'ruby'] },
  { title: 'Statement Choker', prompt: 'Diamond-encrusted gold choker necklace, bold statement piece, on model wearing black evening dress, gala setting, chandelier ambient light', tags: ['necklace', 'gold', 'diamond', 'statement'] },
  { title: 'Tennis Necklace', prompt: 'Diamond tennis necklace in platinum, every stone perfectly matched, laid flat on midnight blue velvet, gallery exhibition lighting', tags: ['necklace', 'platinum', 'diamond'] },
  // Bracelets (5)
  { title: 'Gold Link Bracelet', prompt: 'Chunky gold link bracelet, polished 18k yellow gold, on wrist resting on marble desk, lifestyle professional setting, warm light', tags: ['bracelet', 'gold'] },
  { title: 'Diamond Tennis Bracelet', prompt: 'Diamond tennis bracelet in white gold, on elegant wrist, every stone catching light, close-up photography, studio lighting', tags: ['bracelet', 'white-gold', 'diamond'] },
  { title: 'Silver Charm Bracelet', prompt: 'Sterling silver charm bracelet with assorted luxury charms, on wrist with coffee cup, lifestyle morning scene, warm window light', tags: ['bracelet', 'silver'] },
  { title: 'Bangle Stack', prompt: 'Stack of three gold bangles — plain, textured, and diamond-set — on model wrist, editorial fashion photography, bold composition', tags: ['bracelet', 'gold', 'stack'] },
  { title: 'Cuff Bracelet', prompt: 'Wide gold cuff bracelet with hammered texture, on bare wrist against dark background, dramatic rim lighting, advertising shot', tags: ['bracelet', 'gold', 'cuff'] },
  // Earrings (5)
  { title: 'Diamond Stud Earrings', prompt: 'Round brilliant diamond stud earrings in platinum four-prong setting, on ear in profile view, hair swept back, studio side lighting', tags: ['earrings', 'platinum', 'diamond'] },
  { title: 'Gold Hoop Earrings', prompt: 'Medium gold hoop earrings with small pave diamonds on front, both earrings visible, frontal portrait, balanced studio lighting', tags: ['earrings', 'gold'] },
  { title: 'Chandelier Earrings', prompt: 'Diamond chandelier drop earrings in white gold, on model at evening event, hair in updo, dramatic chandelier bokeh background', tags: ['earrings', 'white-gold', 'diamond'] },
  { title: 'Pearl Drop Earrings', prompt: 'South Sea pearl drop earrings with diamond tops in yellow gold, three-quarter profile, elegant model, soft warm lighting', tags: ['earrings', 'gold', 'pearl'] },
  { title: 'Emerald Cluster Earrings', prompt: 'Emerald and diamond cluster earrings in yellow gold, close-up on ear, shallow depth of field, macro jewelry photography', tags: ['earrings', 'gold', 'emerald'] },
  // Pendants (4)
  { title: 'Cross Pendant', prompt: 'Diamond cross pendant on gold chain, worn on chest, intimate close-up, warm skin tones, personal moment lighting', tags: ['pendant', 'gold', 'diamond'] },
  { title: 'Locket Pendant', prompt: 'Vintage gold locket pendant with engraved floral pattern, open showing space for photo, on antique table, warm candlelight', tags: ['pendant', 'gold', 'vintage'] },
  { title: 'Birthstone Pendant', prompt: 'Oval tanzanite birthstone pendant in white gold with diamond halo, on elegant neck, frontal view, clean studio lighting', tags: ['pendant', 'white-gold', 'tanzanite'] },
  { title: 'Initial Pendant', prompt: 'Gold initial letter pendant C on delicate chain, on model collarbone, minimalist lifestyle photography, natural daylight', tags: ['pendant', 'gold', 'personalized'] },
  // Watches (2)
  { title: 'Diamond Dress Watch', prompt: 'Ladies diamond dress watch with mother of pearl dial and diamond bezel in white gold, on wrist with evening dress cuff visible, luxury setting', tags: ['watch', 'white-gold', 'diamond'] },
  { title: 'Gold Luxury Watch', prompt: 'Mens luxury gold watch with blue dial, on wrist with suit sleeve, inner wrist facing camera, sharp dial detail, professional photography', tags: ['watch', 'gold'] },
];

async function main() {
  console.log('=============================================');
  console.log('  GENERATING 30 JEWELRY PRODUCTS VIA GEMINI');
  console.log('  Model: Gemini 3.1 Flash Image (latest)');
  console.log('=============================================\n');

  let totalCost = 0;
  let success = 0;
  let failed = 0;
  const startTime = Date.now();

  for (let i = 0; i < PRODUCTS.length; i += 2) {
    const batch = PRODUCTS.slice(i, i + 2);
    console.log(`Batch ${Math.floor(i/2)+1}/${Math.ceil(PRODUCTS.length/2)}: ${batch.map(p => p.title).join(', ')}`);

    const results = await Promise.allSettled(
      batch.map(async (product) => {
        const genStart = Date.now();
        const res = await fetch(`${API}/api/generate/image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: product.prompt }),
        });
        const json = await res.json();
        const elapsed = ((Date.now() - genStart) / 1000).toFixed(1);

        if (json.success) {
          // Save to repository
          await fetch(`${API}/api/repository`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: 'generated',
              title: product.title,
              description: product.prompt.slice(0, 200),
              imageUrl: json.data.resultUrl,
              tags: ['product', ...product.tags],
            }),
          });
          return { ...product, cost: json.data.costRaw || 0.02, time: elapsed, model: json.data.model, url: json.data.resultUrl };
        }
        throw new Error(json.error || 'Failed');
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled') {
        success++;
        totalCost += r.value.cost;
        console.log(`  [OK] ${r.value.title} — ${r.value.time}s, $${r.value.cost.toFixed(3)}, ${r.value.model}`);
      } else {
        failed++;
        console.log(`  [FAIL] ${r.reason?.message?.slice(0, 60)}`);
      }
    }
    console.log();
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log('=============================================');
  console.log(`  DONE: ${success}/${PRODUCTS.length} generated`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Total cost: $${totalCost.toFixed(3)}`);
  console.log(`  Avg cost/image: $${(totalCost / (success || 1)).toFixed(4)}`);
  console.log(`  Total time: ${totalTime}s`);
  console.log(`  Avg time/image: ${(parseInt(totalTime) / (success || 1)).toFixed(0)}s`);
  console.log('=============================================');
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
