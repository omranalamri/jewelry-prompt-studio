#!/usr/bin/env node
// Generate 20 diverse human model portraits for the jewelry campaign repository
// 10 female + 10 male, varied ethnicities, ages, styles

import Replicate from 'replicate';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const TOKEN = (() => {
  const env = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  return env.match(/REPLICATE_API_TOKEN="?([^"\n]+)"?/)?.[1];
})();

const replicate = new Replicate({ auth: TOKEN });
const API = 'https://jewelry-prompt-studio.vercel.app';

const MODEL_PROMPTS = [
  // Female models (10)
  { name: 'Aria', gender: 'female', tags: ['young', 'european', 'brunette'],
    prompt: 'Beautiful young European woman, early 20s, dark brown hair pulled back elegantly, natural makeup, soft skin, portrait from shoulders up, neutral expression, studio lighting, clean background, modeling headshot, high-end beauty photography' },
  { name: 'Zara', gender: 'female', tags: ['young', 'south-asian', 'dark-hair'],
    prompt: 'Stunning South Asian woman, mid 20s, long black hair, warm skin tone, subtle golden jewelry-ready styling, elegant portrait, shoulders up, soft studio lighting, natural beauty, professional modeling headshot' },
  { name: 'Amara', gender: 'female', tags: ['young', 'african', 'short-hair'],
    prompt: 'Beautiful African woman, early 20s, short natural hair, rich dark skin, striking features, portrait from shoulders up, elegant pose, studio lighting, clean background, fashion modeling headshot' },
  { name: 'Lin', gender: 'female', tags: ['young', 'east-asian', 'straight-hair'],
    prompt: 'Elegant East Asian woman, mid 20s, sleek straight black hair, porcelain skin, refined features, portrait from shoulders up, minimal makeup, soft studio lighting, high-end modeling headshot' },
  { name: 'Sofia', gender: 'female', tags: ['mature', 'latina', 'wavy-hair'],
    prompt: 'Sophisticated Latina woman, early 30s, rich wavy dark hair, warm olive skin, confident expression, portrait from shoulders up, elegant styling, studio lighting, luxury brand modeling headshot' },
  { name: 'Freya', gender: 'female', tags: ['young', 'scandinavian', 'blonde'],
    prompt: 'Beautiful Scandinavian woman, mid 20s, light blonde hair, fair skin, blue eyes, natural beauty, portrait from shoulders up, minimal makeup, clean studio lighting, fashion modeling headshot' },
  { name: 'Nadia', gender: 'female', tags: ['mature', 'middle-eastern', 'dark-hair'],
    prompt: 'Elegant Middle Eastern woman, late 20s, long dark hair, warm olive complexion, expressive dark eyes, portrait from shoulders up, sophisticated, studio lighting, luxury brand headshot' },
  { name: 'Maya', gender: 'female', tags: ['young', 'mixed', 'curly-hair'],
    prompt: 'Beautiful mixed-race woman, early 20s, curly brown hair, caramel skin, freckles, warm smile, portrait from shoulders up, natural beauty, soft studio lighting, editorial modeling headshot' },
  { name: 'Victoria', gender: 'female', tags: ['mature', 'european', 'red-hair'],
    prompt: 'Striking European woman, early 30s, auburn red hair, fair complexion with freckles, green eyes, elegant and sophisticated, portrait from shoulders up, studio lighting, high-fashion headshot' },
  { name: 'Keiko', gender: 'female', tags: ['mature', 'japanese', 'updo'],
    prompt: 'Refined Japanese woman, late 20s, hair in elegant updo, flawless skin, graceful features, portrait from shoulders up, serene expression, soft studio lighting, luxury beauty headshot' },

  // Male models (10)
  { name: 'James', gender: 'male', tags: ['young', 'european', 'dark-hair'],
    prompt: 'Handsome European man, late 20s, dark brown hair styled neatly, light stubble, strong jawline, portrait from shoulders up, confident expression, studio lighting, clean background, luxury brand modeling headshot' },
  { name: 'Kofi', gender: 'male', tags: ['young', 'african', 'bald'],
    prompt: 'Striking African man, mid 20s, clean shaven head, rich dark skin, strong defined features, portrait from shoulders up, powerful presence, studio lighting, high-end fashion modeling headshot' },
  { name: 'Raj', gender: 'male', tags: ['young', 'south-asian', 'beard'],
    prompt: 'Handsome South Asian man, late 20s, dark hair, well-groomed short beard, warm skin tone, refined features, portrait from shoulders up, confident, studio lighting, luxury brand modeling headshot' },
  { name: 'Chen', gender: 'male', tags: ['young', 'east-asian', 'clean-cut'],
    prompt: 'Handsome East Asian man, mid 20s, clean-cut black hair, smooth skin, sharp features, portrait from shoulders up, modern and refined, studio lighting, high-end modeling headshot' },
  { name: 'Marco', gender: 'male', tags: ['mature', 'mediterranean', 'stubble'],
    prompt: 'Distinguished Mediterranean man, early 30s, dark curly hair, olive skin, designer stubble, warm brown eyes, portrait from shoulders up, sophisticated, studio lighting, luxury fashion headshot' },
  { name: 'Erik', gender: 'male', tags: ['mature', 'scandinavian', 'blonde'],
    prompt: 'Handsome Scandinavian man, late 20s, light blonde hair, blue eyes, fair skin, strong Nordic features, portrait from shoulders up, clean-cut, studio lighting, premium brand modeling headshot' },
  { name: 'Omar', gender: 'male', tags: ['young', 'middle-eastern', 'dark-hair'],
    prompt: 'Striking Middle Eastern man, mid 20s, thick dark hair, olive complexion, dark expressive eyes, trimmed beard, portrait from shoulders up, elegant, studio lighting, luxury modeling headshot' },
  { name: 'Diego', gender: 'male', tags: ['young', 'latino', 'wavy-hair'],
    prompt: 'Handsome Latino man, late 20s, wavy dark hair, warm bronze skin, charming expression, portrait from shoulders up, confident and approachable, studio lighting, fashion modeling headshot' },
  { name: 'Akira', gender: 'male', tags: ['mature', 'japanese', 'styled'],
    prompt: 'Refined Japanese man, early 30s, styled dark hair, clean-shaven, sharp features, sophisticated expression, portrait from shoulders up, minimalist elegance, studio lighting, luxury brand headshot' },
  { name: 'Liam', gender: 'male', tags: ['young', 'irish', 'red-hair'],
    prompt: 'Handsome Irish man, mid 20s, auburn hair, light freckles, green eyes, strong jawline, portrait from shoulders up, natural rugged charm, studio lighting, high-end modeling headshot' },
];

async function main() {
  console.log('==============================================');
  console.log('  GENERATING 20 MODEL PORTRAITS');
  console.log('  10 Female + 10 Male, diverse');
  console.log('==============================================\n');

  const results = [];

  for (let i = 0; i < MODEL_PROMPTS.length; i += 3) {
    const batch = MODEL_PROMPTS.slice(i, i + 3);
    console.log(`Batch ${Math.floor(i/3)+1}: ${batch.map(m => m.name).join(', ')}...`);

    const batchResults = await Promise.allSettled(
      batch.map(async (model) => {
        const output = await replicate.run('google/nano-banana-2', {
          input: { prompt: model.prompt, resolution: '1K', aspect_ratio: '1:1', output_format: 'jpg' },
        });
        const url = Array.isArray(output) ? String(output[0]) : String(output);
        console.log(`  ${model.name} (${model.gender}) — done`);
        return { ...model, imageUrl: url };
      })
    );

    for (const r of batchResults) {
      if (r.status === 'fulfilled') {
        results.push(r.value);
        // Save to repository via API
        try {
          await fetch(`${API}/api/repository`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: 'model',
              title: `${r.value.name} — ${r.value.gender === 'female' ? 'Female' : 'Male'} Model`,
              description: `${r.value.tags.join(', ')} — ${r.value.gender} model for jewelry campaigns`,
              imageUrl: r.value.imageUrl,
              tags: ['model', r.value.gender, ...r.value.tags],
            }),
          });
        } catch { /* */ }
      } else {
        console.log(`  FAILED: ${r.reason?.message?.slice(0, 60)}`);
      }
    }
  }

  // Save local catalog
  writeFileSync(resolve(process.cwd(), 'public/model-catalog.json'), JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: results.length,
    models: results.map(r => ({
      name: r.name, gender: r.gender, tags: r.tags, imageUrl: r.imageUrl,
    })),
  }, null, 2));

  console.log(`\n==============================================`);
  console.log(`  DONE: ${results.length}/20 models generated`);
  console.log(`  Saved to repository + public/model-catalog.json`);
  console.log(`==============================================`);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
