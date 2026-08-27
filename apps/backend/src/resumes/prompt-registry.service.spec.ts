import { PromptRegistryService } from './prompt-registry.service';

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
});
