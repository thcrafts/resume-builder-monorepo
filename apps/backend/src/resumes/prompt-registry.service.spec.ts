import { PromptRegistryService, extractIndustryDomainOverlay } from './prompt-registry.service';

describe('PromptRegistryService', () => {
  const service = new PromptRegistryService();

  it('returns user instructions for default industry', () => {
    expect(service.resolveInstructions('default', 'My custom prompt')).toBe(
      'My custom prompt',
    );
  });

  it('loads ai industry prompt from assets', () => {
    const prompt = service.resolveInstructions('ai', null);
    expect(prompt).toContain('ATS-friendly');
    expect(prompt.length).toBeGreaterThan(1000);
  });

  it('throws when default industry has no user instructions', () => {
    expect(() => service.resolveInstructions('default', '  ')).toThrow();
  });

  it('uses domain-wording overlay instead of the legacy first 1KB', () => {
    const overlay = service.getIndustryOverlay('healthcare');
    expect(overlay).toContain('PRIMARY TAILORING OBJECTIVE');
    expect(overlay).toContain('healthcare');
    expect(overlay).not.toContain('every bullet must include a number');
    expect(overlay).not.toContain('Return exactly one JSON object');
  });
});

describe('extractIndustryDomainOverlay', () => {
  it('keeps tailoring and emphasis rules and drops metric mandates', () => {
    const overlay = extractIndustryDomainOverlay(`
PRIMARY TAILORING OBJECTIVE
Optimize for healthcare platforms.

RESUME WRITING RULES
For bullets, prefer: every bullet must include a number

SOUTH TEXAS HOME HEALTH EMPHASIS RULES
Treat South Texas Home Health as the strongest current role.
the title must match the root-level resume title exactly

COVER LETTER RULES
Write a cover letter.
`);

    expect(overlay).toContain('PRIMARY TAILORING OBJECTIVE');
    expect(overlay).toContain('SOUTH TEXAS HOME HEALTH EMPHASIS RULES');
    expect(overlay).not.toContain('every bullet must include a number');
    expect(overlay).not.toContain('COVER LETTER RULES');
  });
});
