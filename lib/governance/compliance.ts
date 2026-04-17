// UAE Compliance Checker
// Federal Media Law 55/2023, Mu'lin Permits, AML thresholds, jewelry purity

export type ComplianceSeverity = 'error' | 'warning' | 'info';
export type ComplianceCategory = 'regulatory' | 'brand' | 'platform' | 'cultural';

export interface ComplianceIssue {
  severity: ComplianceSeverity;
  category: ComplianceCategory;
  description: string;
  requiredAction: string;
  legalReference?: string;
}

export interface ComplianceInput {
  images?: string[];
  copy?: { en?: string; ar?: string };
  isAiGenerated: boolean;
  isCommercialPost: boolean;
  platform?: string;
  jewelryPurityClaims?: string[];
  priceClaims?: string[];
  itemValueAED?: number;
  mulinPermitNumber?: string;
}

export interface ComplianceReport {
  status: 'approved' | 'conditional' | 'rejected';
  issues: ComplianceIssue[];
  requiredChanges: string[];
  regulatoryReferences: string[];
  c2paRequired: boolean;
  mulinPermitRequired: boolean;
  disclosureTagsRequired: boolean;
}

const VALID_PURITY_MARKS = ['18k', '21k', '22k', '24k', '925', 'platinum 950', 'pt950'];
const AML_THRESHOLD_AED = 55000;

export function runComplianceCheck(input: ComplianceInput): ComplianceReport {
  const issues: ComplianceIssue[] = [];
  const regRefs = new Set<string>();

  // 1. AI-generated content → C2PA
  if (input.isAiGenerated) {
    issues.push({
      severity: 'warning',
      category: 'regulatory',
      description: 'AI-generated content detected — C2PA provenance signing required before publication',
      requiredAction: 'Sign with C2PA manifest via @contentauth/c2pa-node',
      legalReference: 'UAE Media Council AI Content Guidelines 2025',
    });
    regRefs.add('UAE Media Council AI Content Guidelines 2025');
  }

  // 2. Commercial post → Mu'lin permit
  if (input.isCommercialPost) {
    if (!input.mulinPermitNumber) {
      issues.push({
        severity: 'error',
        category: 'regulatory',
        description: 'Commercial post missing Mu\'lin (Advertiser) Permit number',
        requiredAction: 'Add Mu\'lin permit number to post metadata. Obtain from UAE Media Council if needed.',
        legalReference: 'UAE Advertising Regulations (effective Oct 2025)',
      });
      regRefs.add('UAE Advertising Regulations (Oct 2025)');
    }

    // Check for #ad disclosure in copy
    const enCopy = (input.copy?.en || '').toLowerCase();
    const arCopy = input.copy?.ar || '';
    const hasEnDisclosure = enCopy.includes('#ad') || enCopy.includes('#sponsored');
    const hasArDisclosure = arCopy.includes('#إعلان') || arCopy.includes('#اعلان');

    if (input.copy?.en && !hasEnDisclosure) {
      issues.push({
        severity: 'error',
        category: 'regulatory',
        description: 'Missing #ad disclosure in English copy',
        requiredAction: 'Add #ad to English caption',
        legalReference: 'Federal Media Law No. 55 (2023)',
      });
      regRefs.add('Federal Media Law No. 55 (2023)');
    }

    if (input.copy?.ar && !hasArDisclosure) {
      issues.push({
        severity: 'error',
        category: 'regulatory',
        description: 'Missing #إعلان disclosure in Arabic copy',
        requiredAction: 'Add #إعلان to Arabic caption',
        legalReference: 'Federal Media Law No. 55 (2023)',
      });
      regRefs.add('Federal Media Law No. 55 (2023)');
    }
  }

  // 3. Jewelry purity claims
  for (const claim of input.jewelryPurityClaims || []) {
    const normalized = claim.toLowerCase().trim();
    if (!VALID_PURITY_MARKS.some(v => normalized.includes(v))) {
      issues.push({
        severity: 'error',
        category: 'regulatory',
        description: `Unverified jewelry purity claim: "${claim}"`,
        requiredAction: 'Use only certified purity marks (18k, 21k, 22k, 24k, 925, Platinum 950). Back up with certification.',
        legalReference: 'UAE Gold/Jewelry Hallmarking Standards',
      });
      regRefs.add('UAE Gold/Jewelry Hallmarking Standards');
    }
  }

  // 4. High-value items → AML
  if (input.itemValueAED && input.itemValueAED > AML_THRESHOLD_AED) {
    issues.push({
      severity: 'warning',
      category: 'regulatory',
      description: `Item value AED ${input.itemValueAED.toLocaleString()} exceeds AML threshold (AED ${AML_THRESHOLD_AED.toLocaleString()})`,
      requiredAction: 'Ensure AML compliance tagging for transactions above AED 55,000',
      legalReference: 'Federal Decree-Law No. 10/2025',
    });
    regRefs.add('Federal Decree-Law No. 10/2025');
  }

  // 5. Price claims in copy
  for (const priceClaim of input.priceClaims || []) {
    if (/\b(cheap|affordable|deal|discount|sale|bargain)\b/i.test(priceClaim)) {
      issues.push({
        severity: 'warning',
        category: 'brand',
        description: `Price language "${priceClaim}" conflicts with luxury brand voice`,
        requiredAction: 'Remove discount/price language. Luxury jewelry uses investment/value framing.',
      });
    }
  }

  // Determine overall status
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');
  const status = errors.length > 0 ? 'rejected' : warnings.length > 0 ? 'conditional' : 'approved';

  return {
    status,
    issues,
    requiredChanges: errors.map(e => e.requiredAction),
    regulatoryReferences: Array.from(regRefs),
    c2paRequired: input.isAiGenerated,
    mulinPermitRequired: input.isCommercialPost,
    disclosureTagsRequired: input.isCommercialPost,
  };
}
