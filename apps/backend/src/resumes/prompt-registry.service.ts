import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const INDUSTRY_PROMPTS_DIR = join(
  process.cwd(),
  'assets',
  'prompts',
  'industries',
);

const SUPPORTED_INDUSTRIES = [
  'ai',
  'cybersecurity',
  'ecommerce',
  'fintech',
  'food',
  'insurance',
  'marketing',
  'realestate',
  'gaming',
  'telecom',
  'healthcare',
] as const;

export type IndustryPromptId = (typeof SUPPORTED_INDUSTRIES)[number];

@Injectable()
export class PromptRegistryService {
  private readonly cache = new Map<string, string>();

  getSupportedIndustries(): readonly string[] {
    return SUPPORTED_INDUSTRIES;
  }

  resolveInstructions(
    industry: string | undefined,
    userInstructions?: string | null,
  ): string {
    if (!industry || industry === 'default') {
      const trimmed = userInstructions?.trim();
      if (!trimmed) {
        throw new NotFoundException(
          'No resume prompt configured. Add your resume prompt in Profile settings before generating a resume.',
        );
      }
      return trimmed;
    }

    if (!SUPPORTED_INDUSTRIES.includes(industry as IndustryPromptId)) {
      throw new NotFoundException(`Unknown industry prompt: ${industry}`);
    }

    return this.loadIndustryPrompt(industry);
  }

  private loadIndustryPrompt(industry: string): string {
    const cached = this.cache.get(industry);
    if (cached) {
      return cached;
    }

    const filePath = join(INDUSTRY_PROMPTS_DIR, `${industry}.md`);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Industry prompt file not found: ${industry}`);
    }

    const content = readFileSync(filePath, 'utf-8').trim();
    this.cache.set(industry, content);
    return content;
  }
}
