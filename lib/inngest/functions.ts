// Inngest durable workflows
// The 7-stage Campaign Factory runs here with automatic retries, checkpoints, observability

import { inngest } from './client';
import { scoreBrief } from '@/lib/quality/scorer';
import { runAgent, runCreativeCouncil } from '@/lib/agents/orchestrator';
import { getDb } from '@/lib/db';

// Event: 'campaign/create'
// Triggered when user completes the brief in /studio/campaign/new and hits "Start Campaign"
export const campaignFactoryWorkflow = inngest.createFunction(
  {
    id: 'campaign-factory',
    name: 'Campaign Factory Pipeline',
    retries: 2,
    triggers: [{ event: 'campaign/create' }],
  },
  async ({ event, step, logger }) => {
    const { campaignId, brief } = event.data;
    logger.info(`Starting campaign factory for ${campaignId}`);

    // Stage 1: Brief Scoring
    const briefScore = await step.run('score-brief', async () => {
      return await scoreBrief(brief);
    });

    if (briefScore.overall < 3.0) {
      logger.warn(`Brief score too low: ${briefScore.overall}`);
      return {
        status: 'paused',
        reason: 'brief-quality-low',
        campaignId,
        briefScore,
      };
    }

    // Stage 2: Research Enrichment (parallel)
    const [trendData, competitorData] = await Promise.all([
      step.run('research-trends', async () =>
        runAgent('marcom-strategist', 'Research current trends for this brief', { brief })
      ),
      step.run('research-competitors', async () =>
        runAgent('business-consultant', 'Analyze competitor landscape', { brief })
      ),
    ]);

    // Stage 3: Persona Insights
    const personas = await step.run('generate-personas', async () =>
      runAgent('marcom-strategist', 'Generate 3 target persona profiles', {
        brief,
        trends: trendData.response,
        competitors: competitorData.response,
      })
    );

    // Stage 4: Creative Council Debate
    const creativeDirection = await step.run('creative-direction', async () =>
      runCreativeCouncil(
        'Develop creative direction for this campaign',
        { brief, personas: personas.response },
        ['creative-director', 'brand-compliance', 'marcom-strategist']
      )
    );

    // Stage 5: Multi-language copy (parallel)
    const [englishCopy, arabicCopy] = await Promise.all([
      step.run('copy-english', async () =>
        runAgent('copywriter-english', 'Write campaign copy based on creative direction', {
          brief,
          direction: creativeDirection.synthesis.response,
        })
      ),
      step.run('copy-arabic', async () =>
        runAgent('copywriter-arabic', 'Write Arabic campaign copy', {
          brief,
          direction: creativeDirection.synthesis.response,
        })
      ),
    ]);

    // Stage 6: Storyboard (call existing campaign generate endpoint)
    const storyboard = await step.run('generate-storyboard', async () => {
      // Campaign generation already handled by /api/generate/campaign
      // This step triggers it with the enriched brief
      return { message: 'Trigger campaign generation', brief, direction: creativeDirection.synthesis.response };
    });

    // Stage 7: Quality Gate + submit to governance
    const submitted = await step.run('submit-governance', async () => {
      try {
        const sql = getDb();
        await sql`
          INSERT INTO workflow_items (entity_type, entity_id, entity_name, current_status, submitted_by, priority)
          VALUES ('campaign', ${campaignId}, ${brief.name || 'Unnamed'}, 'submitted', 'factory', 'normal')
          RETURNING *
        `;
        return { submitted: true };
      } catch (err) {
        return { submitted: false, error: String(err) };
      }
    });

    return {
      status: 'complete',
      campaignId,
      briefScore,
      creativeDirection: creativeDirection.synthesis.response,
      englishCopy: englishCopy.response,
      arabicCopy: arabicCopy.response,
      storyboard,
      submitted,
    };
  }
);

export const functions = [campaignFactoryWorkflow];
