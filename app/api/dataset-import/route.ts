import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { put } from '@vercel/blob';

export const maxDuration = 300;

interface DatasetConfig {
  id: string;
  name: string;
  hfDataset: string;
  imageColumn: string; // which column has the target image
  totalRows: number;
  jewelryTypes: string[]; // will classify by prompt field
  subCategory: string;
  poseType: string;
}

const DATASETS: DatasetConfig[] = [
  {
    id: 'flux-jewelry-16k',
    name: 'Flux Jewelry Training',
    hfDataset: 'raresense/Single_panel_training_flux_jewelry',
    imageColumn: 'target',
    totalRows: 16403,
    jewelryTypes: ['ring', 'necklace', 'bracelet', 'earring', 'watch'],
    subCategory: 'on-body',
    poseType: 'model-wearing',
  },
  {
    id: 'necklace-zoom-1k',
    name: 'Necklace Same Zoom',
    hfDataset: 'raresense/necklace_same_zoom',
    imageColumn: 'target',
    totalRows: 1367,
    jewelryTypes: ['necklace'],
    subCategory: 'on-body',
    poseType: 'necklace-decolletage',
  },
  {
    id: 'necklace-masks-900',
    name: 'Necklace New Mask',
    hfDataset: 'raresense/necklace_new_mask',
    imageColumn: 'target',
    totalRows: 900,
    jewelryTypes: ['necklace'],
    subCategory: 'on-body',
    poseType: 'necklace-decolletage',
  },
  {
    id: 'flux-ring-only',
    name: 'Flux Ring Only',
    hfDataset: 'raresense/flux_single_panel_ring_only',
    imageColumn: 'target',
    totalRows: 5000, // estimate
    jewelryTypes: ['ring'],
    subCategory: 'on-hand',
    poseType: 'ring-on-finger',
  },
  {
    id: 'flux-necklace-only',
    name: 'Flux Necklace Only',
    hfDataset: 'raresense/flux_single_panel_necklace',
    imageColumn: 'target',
    totalRows: 5970,
    jewelryTypes: ['necklace'],
    subCategory: 'on-body',
    poseType: 'necklace-decolletage',
  },
];

// GET — list available datasets and import progress
export async function GET() {
  try {
    const sql = getDb();

    // Count imported items per dataset
    const imported = await sql`
      SELECT dataset_source, jewelry_type, sub_category, COUNT(*) as count
      FROM repository WHERE dataset_source IS NOT NULL
      GROUP BY dataset_source, jewelry_type, sub_category
      ORDER BY dataset_source, count DESC
    `;

    // Overall counts by classification
    const byType = await sql`
      SELECT jewelry_type, COUNT(*) as count FROM repository WHERE jewelry_type IS NOT NULL GROUP BY jewelry_type ORDER BY count DESC
    `;

    const bySubCat = await sql`
      SELECT sub_category, COUNT(*) as count FROM repository WHERE sub_category IS NOT NULL GROUP BY sub_category ORDER BY count DESC
    `;

    const byPose = await sql`
      SELECT pose_type, COUNT(*) as count FROM repository WHERE pose_type IS NOT NULL GROUP BY pose_type ORDER BY count DESC
    `;

    return Response.json({
      success: true,
      data: {
        availableDatasets: DATASETS.map(d => ({
          id: d.id, name: d.name, totalRows: d.totalRows,
          jewelryTypes: d.jewelryTypes, subCategory: d.subCategory,
        })),
        imported,
        classifications: { byType, bySubCat, byPose },
      },
    });
  } catch (error) {
    console.error('Dataset import error:', error);
    return Response.json({ success: false, error: 'Failed.' }, { status: 500 });
  }
}

// POST — import a batch from a dataset
export async function POST(req: NextRequest) {
  try {
    const { datasetId, batchSize = 50, offset = 0 } = await req.json();

    const config = DATASETS.find(d => d.id === datasetId);
    if (!config) return Response.json({ success: false, error: 'Unknown dataset.' }, { status: 400 });

    // Fetch batch from HuggingFace
    const hfUrl = `https://datasets-server.huggingface.co/rows?dataset=${config.hfDataset}&config=default&split=train&offset=${offset}&length=${batchSize}`;
    const hfRes = await fetch(hfUrl);
    if (!hfRes.ok) return Response.json({ success: false, error: `HuggingFace error: ${hfRes.status}` }, { status: 500 });

    const hfData = await hfRes.json();
    const rows = hfData.rows || [];

    const sql = getDb();
    let saved = 0;
    const prompts: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]?.row || {};
      const imgData = row[config.imageColumn];
      const imgUrl = imgData?.src;
      const prompt = row.prompt || '';
      const hasMask = !!row.mask?.src;

      if (!imgUrl) continue;

      // Classify jewelry type from prompt
      let jewelryType = config.jewelryTypes[0] || 'jewelry';
      for (const t of ['ring', 'necklace', 'bracelet', 'earring', 'watch', 'pendant', 'bangle']) {
        if (prompt.toLowerCase().includes(t)) { jewelryType = t; break; }
      }
      if (prompt.includes('earrings')) jewelryType = 'earrings';

      if (prompt) prompts.push(prompt);

      // Download and upload to Blob
      try {
        const imgRes = await fetch(imgUrl);
        if (!imgRes.ok) continue;
        const imgBlob = await imgRes.blob();

        const blobResult = await put(
          `raresense/${config.id}/${jewelryType}-${offset + i}.jpg`,
          imgBlob,
          { access: 'public' }
        );

        // Save with full classification
        await sql`INSERT INTO repository (
          category, title, description, image_url, tags,
          sub_category, jewelry_type, pose_type, original_prompt, dataset_source, has_mask
        ) VALUES (
          'reference',
          ${`${jewelryType} ref ${offset + i}`},
          ${`Professional ${jewelryType} reference from ${config.name}`},
          ${blobResult.url},
          ${[jewelryType, 'raresense', config.subCategory, config.poseType]},
          ${config.subCategory},
          ${jewelryType},
          ${config.poseType},
          ${prompt || null},
          ${config.id},
          ${hasMask}
        )`;
        saved++;
      } catch {
        continue;
      }
    }

    // Log unique prompts we found (useful for improving our prompt agent)
    const uniquePrompts = [...new Set(prompts)];

    return Response.json({
      success: true,
      data: {
        dataset: config.name,
        requested: batchSize,
        fetched: rows.length,
        saved,
        offset,
        nextOffset: offset + batchSize,
        hasMore: offset + batchSize < config.totalRows,
        totalInDataset: config.totalRows,
        uniquePrompts,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return Response.json({ success: false, error: 'Import failed.' }, { status: 500 });
  }
}
