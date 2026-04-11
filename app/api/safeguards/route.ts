import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';

// System changelog + safeguards API
// Every change to the system gets logged. Changes can be rolled back.

export async function GET() {
  try {
    const sql = getDb();

    // Get recent changes
    const changelog = await sql`
      SELECT * FROM system_changelog ORDER BY created_at DESC LIMIT 30
    `;

    // Get prompt versions
    const promptVersions = await sql`
      SELECT * FROM prompt_versions ORDER BY prompt_key, version DESC
    `;

    // Health check — is anything broken?
    const health = {
      generationsLast24h: 0,
      avgRatingLast24h: 0,
      errorsLast24h: 0,
      activePromptVersions: promptVersions.filter(v => v.is_active).length,
    };

    try {
      const genStats = await sql`
        SELECT COUNT(*) as count, AVG(user_rating) as avg_rating
        FROM generations WHERE created_at > now() - interval '24 hours'
      `;
      health.generationsLast24h = parseInt(genStats[0].count as string);
      health.avgRatingLast24h = parseFloat(genStats[0].avg_rating as string || '0');

      const errStats = await sql`
        SELECT COUNT(*) as count FROM generations
        WHERE was_regenerated = true AND created_at > now() - interval '24 hours'
      `;
      health.errorsLast24h = parseInt(errStats[0].count as string);
    } catch { /* tables might not have data yet */ }

    return Response.json({ success: true, data: { changelog, promptVersions, health } });
  } catch (error) {
    console.error('Safeguards error:', error);
    return Response.json({ success: false, error: 'Failed to load.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action, data } = await req.json();
    const sql = getDb();

    if (action === 'log-change') {
      // Log any system change
      await sql`INSERT INTO system_changelog (change_type, description, details)
        VALUES (${data.type}, ${data.description}, ${JSON.stringify(data.details || {})})`;
      return Response.json({ success: true });
    }

    if (action === 'save-prompt-version') {
      // Save a new version of a system prompt
      const { promptKey, promptText, changeDescription, activate } = data;

      // Get next version number
      const maxVersion = await sql`SELECT COALESCE(MAX(version), 0) as max FROM prompt_versions WHERE prompt_key = ${promptKey}`;
      const nextVersion = parseInt(maxVersion[0].max as string) + 1;

      // If activating, deactivate current
      if (activate) {
        await sql`UPDATE prompt_versions SET is_active = false WHERE prompt_key = ${promptKey}`;
      }

      await sql`INSERT INTO prompt_versions (prompt_key, version, prompt_text, change_description, is_active)
        VALUES (${promptKey}, ${nextVersion}, ${promptText}, ${changeDescription}, ${activate || false})`;

      // Log the change
      await sql`INSERT INTO system_changelog (change_type, description, details)
        VALUES ('prompt-update', ${`Prompt "${promptKey}" updated to v${nextVersion}: ${changeDescription}`}, ${JSON.stringify({ promptKey, version: nextVersion, activated: activate })})`;

      return Response.json({ success: true, data: { version: nextVersion } });
    }

    if (action === 'rollback-prompt') {
      // Rollback to a previous prompt version
      const { promptKey, targetVersion } = data;

      await sql`UPDATE prompt_versions SET is_active = false WHERE prompt_key = ${promptKey}`;
      await sql`UPDATE prompt_versions SET is_active = true WHERE prompt_key = ${promptKey} AND version = ${targetVersion}`;

      await sql`INSERT INTO system_changelog (change_type, description, details)
        VALUES ('prompt-rollback', ${`Rolled back "${promptKey}" to version ${targetVersion}`}, ${JSON.stringify({ promptKey, targetVersion })})`;

      return Response.json({ success: true });
    }

    if (action === 'approve-resource') {
      // Approve a research resource for integration
      const { resourceId, notes } = data;

      await sql`INSERT INTO system_changelog (change_type, description, details)
        VALUES ('resource-approved', ${`Resource "${resourceId}" approved for integration: ${notes || ''}`}, ${JSON.stringify({ resourceId, notes })})`;

      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('Safeguards action error:', error);
    return Response.json({ success: false, error: 'Action failed.' }, { status: 500 });
  }
}
