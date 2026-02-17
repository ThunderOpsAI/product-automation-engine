import { callGeminiJSON, getSupabase, SourcePack, APPROVED_SOURCES } from '@s1/shared';
import { completeTask } from '../lib/complete-task.js';

// ═══════════════════════════════════════════
// AGENT 2: ASSET SOURCING
// ═══════════════════════════════════════════
//
// Mission: Find legal, licensable materials for a given niche.
// Output: SourcePack with compliance notes
// Threshold: 7 (below → needs human approval)
// Hard rule: NEVER use copyrighted material

const ASSET_SOURCING_SYSTEM_PROMPT = `You are a digital asset sourcing specialist.
Your job is to find legal, commercially-usable materials for creating digital products.

APPROVED SOURCES ONLY:
- archive.org (public domain works)
- commons.wikimedia.org (CC0 images, diagrams)
- github.com (open source repos with permissive licenses: MIT, Apache 2.0, BSD)
- gutenberg.org (public domain books and texts)
- data.gov (US government open data)
- nasa.gov (NASA imagery, public domain)

HARD RULES:
- NEVER suggest copyrighted material
- NEVER use CC-BY-NC (no commercial use) or CC-BY-SA (share-alike restrictions)
- Every source MUST have a verifiable license
- When in doubt, mark confidence lower and flag for human review

You MUST respond with valid JSON only.`;

const ASSET_SOURCING_PROMPT = `Find digital assets for creating products in the following niche:

NICHE: {niche}
POSITIONING: {positioning}

For each source, provide:
- type: 'public_domain' | 'cc0' | 'purchased' | 'original'
- url: direct link to the source
- license: license identifier or URL
- files: list of specific files/resources to download
- quality_score: 1-10

Also provide:
- compliance_notes: summary of licensing review
- confidence_score: 1-10 overall confidence that these assets are legal and usable

Respond with JSON matching the SourcePack interface:
{
  "sources": [...],
  "compliance_notes": "...",
  "confidence_score": N
}`;

/**
 * Validate that all sources come from approved domains.
 */
function validateAssetCompliance(pack: SourcePack): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const source of pack.sources) {
        if (source.url) {
            const domain = new URL(source.url).hostname.replace('www.', '');
            const isApproved = APPROVED_SOURCES.some((approved) => domain.endsWith(approved));

            if (!isApproved) {
                issues.push(`Source ${source.url} is not from an approved domain`);
            }
        }

        if (!source.license || source.license.trim() === '') {
            issues.push(`Source missing license information: ${source.url || 'unknown'}`);
        }

        // Flag restrictive licenses
        const license = (source.license || '').toLowerCase();
        if (license.includes('nc') || license.includes('non-commercial')) {
            issues.push(`Non-commercial license detected: ${source.license}`);
        }
        if (license.includes('sa') || license.includes('share-alike')) {
            issues.push(`Share-alike license detected (may restrict product distribution): ${source.license}`);
        }
    }

    return { valid: issues.length === 0, issues };
}

/**
 * Run the AssetSourcing agent.
 * Finds legal assets for a given niche, validates compliance,
 * and routes via completeTask() based on confidence threshold.
 */
export async function runAssetSourcingAgent(
    taskId: string,
    niche: string,
    positioning: string
): Promise<SourcePack> {
    const supabase = getSupabase();
    await supabase.from('tasks').update({ status: 'running' }).eq('id', taskId);

    try {
        const prompt = ASSET_SOURCING_PROMPT
            .replace('{niche}', niche)
            .replace('{positioning}', positioning);

        const pack = await callGeminiJSON<SourcePack>({
            prompt,
            system: ASSET_SOURCING_SYSTEM_PROMPT,
            maxTokens: 4000,
            temperature: 0.5,
        });

        // Validate compliance
        const compliance = validateAssetCompliance(pack);
        if (!compliance.valid) {
            // Lower confidence if compliance issues found
            pack.confidence_score = Math.min(pack.confidence_score, 5);
            pack.compliance_notes += `\n\nCOMPLIANCE ISSUES:\n${compliance.issues.join('\n')}`;
        }

        await completeTask(
            taskId,
            'asset_sourcing',
            { pack },
            pack.confidence_score,
            {
                source_count: pack.sources.length,
                compliance_valid: compliance.valid,
                compliance_issues: compliance.issues,
            }
        );

        return pack;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await supabase
            .from('tasks')
            .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
            .eq('id', taskId);
        throw error;
    }
}
