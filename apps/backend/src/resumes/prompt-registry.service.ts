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

const SKIP_OVERLAY_LINE =
  /every bullet must include a number|EVERY bullet MUST include|derive a realistic improvement|title must match the root-level|SPECIAL TITLE RULE|TITLE NORMALIZATION|Do NOT copy the job description title|root-level resume title/i;

function sliceBetween(text: string, start: string, end: string): string {
  const startIdx = text.indexOf(start);
  if (startIdx < 0) {
    return '';
  }
  const endIdx = text.indexOf(end, startIdx + start.length);
  return (endIdx < 0 ? text.slice(startIdx) : text.slice(startIdx, endIdx)).trim();
}

/** Domain-wording hints only — no metric mandate, title rewrite, or JSON-schema instructions. */
export function extractIndustryDomainOverlay(fullPrompt: string): string {
  const text = fullPrompt.replace(/\r\n/g, '\n');
  const sections: string[] = [];

  const primary = sliceBetween(
    text,
    'PRIMARY TAILORING OBJECTIVE',
    'RESUME WRITING RULES',
  );
  if (primary) {
    sections.push(primary);
  }

  const emphasisMatch = text.match(
    /\n([A-Z0-9][A-Z0-9 &'./-]* EMPHASIS RULES)\n([\s\S]*?)(?=\nCOVER LETTER RULES\b)/,
  );
  if (emphasisMatch) {
    sections.push(`${emphasisMatch[1]}\n${emphasisMatch[2].trim()}`);
  }

  const overlay = sections
    .join('\n\n')
    .split('\n')
    .filter((line) => !SKIP_OVERLAY_LINE.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return overlay;
}

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

  getIndustryOverlay(industry: string | undefined): string | null {
    if (!industry || industry === 'default') {
      return null;
    }

    if (!SUPPORTED_INDUSTRIES.includes(industry as IndustryPromptId)) {
      return null;
    }

    const full = this.loadIndustryPrompt(industry);
    const overlay = extractIndustryDomainOverlay(full);
    return overlay || null;
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
