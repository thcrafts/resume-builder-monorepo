import { Injectable } from '@nestjs/common';
import { ResumeData } from 'src/resumes/templates';
import { resolveApiModelId } from './ai-models';
import { buildResumeJsonSchema } from './resume-json-schema';
import type { ResumeSettings } from './resume-settings';
import { resolveResumeSettings } from './resume-settings';
import {
  DEFAULT_COVER_LETTER_PROMPT,
  DEFAULT_QUESTIONS_PROMPT,
  DEFAULT_TITLE_MATCH_PROMPT,
  DEFAULT_JD_REQUIREMENTS_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_SKILLS_PROMPT,
  DEFAULT_TITLE_MATCH_MODEL,
  DEFAULT_JD_EXTRACTION_MODEL,
  DEFAULT_SUMMARY_MODEL,
  DEFAULT_SKILLS_MODEL,
  DEFAULT_EXPERIENCE_MODEL,
  TITLE_MATCH_MAX_TOKENS,
  JD_EXTRACTION_MAX_TOKENS,
  SUMMARY_MAX_TOKENS,
  SKILLS_MAX_TOKENS,
  EXPERIENCE_MAX_TOKENS,
  TITLE_SIMILARITY_THRESHOLD,
  type CompanyEntry,
  type CandidateProfileData,
  type JdAlignmentRequirements,
  buildExperienceAlignmentUserBlock,
  JD_MOST_RECENT_EXCERPT_CHARS,
  applySummaryExperienceYears,
} from '@resume-builder/shared';
import { cleanText } from './clean-text';
import { prepareResumeGenerationInstructions } from './prepare-resume-instructions';
import type { UserApiKeys } from './user-api-keys';
import { normalizeResumeExperienceBullets } from './normalize-resume-json';
import { OpenRouterService } from '../openrouter/openrouter.service';
import {
  parseTitleMatchResult,
  resolveFinalTitle,
  titleMatchJsonSchema,
} from './schemas/title-match.schema';
import {
  parseJdRequirementsResult,
  jdRequirementsJsonSchema,
} from './schemas/jd-requirements.schema';
import { parseSummaryResult, summaryJsonSchema } from './schemas/summary.schema';
import { parseSkillsResult, buildSkillsJsonSchema, buildSkillsFallback } from './schemas/skills.schema';
import {
  parseExperienceResult,
  alignExperienceResultWithJd,
  experienceJsonSchema,
} from './schemas/experience.schema';
import { prepareCompanyExperienceInstructions } from './prepare-company-experience-instructions';
import {
  enrichSkillsWithSources,
  normalizeGeneratedSkills,
} from './normalize-resume-skills';

export interface SkillsGenerationContext {
  companies: Array<{
    company: string;
    title: string;
    product: string;
    mission: string;
    roleSkills: string[];
  }>;
}

@Injectable()
export class AiService {
  constructor(private readonly openRouterService: OpenRouterService) {}

  async generateResume(
    jobDescription: string,
    userInstructions: string,
    aiProvider: string = 'anthropic',
    aiVersion: string = 'anthropic/claude-sonnet-4.6',
    apiKeys?: UserApiKeys,
    resumeSettings?: Partial<ResumeSettings>,
  ): Promise<{ resumeJson: ResumeData; threadId: string }> {
    if (!userInstructions || !userInstructions.trim()) {
      throw new Error('User instructions are required and cannot be empty');
    }

    const settings = resolveResumeSettings(resumeSettings);
    const resumeJsonSchema = settings.useDefaultOutputFormat
      ? buildResumeJsonSchema(settings)
      : undefined;
    const fullInstructions = prepareResumeGenerationInstructions(
      userInstructions,
      resumeJsonSchema,
    );
    const cleanedJobDescription = cleanText(jobDescription);
    const apiModelId = resolveApiModelId(aiProvider, aiVersion);

    const { resumeJson, responseId } = await this.openRouterService.generateResume(
      cleanedJobDescription,
      fullInstructions,
      apiModelId,
      apiKeys,
      true,
    );

    return {
      resumeJson: normalizeResumeExperienceBullets(resumeJson),
      threadId: responseId,
    };
  }

  async matchTitle(
    jobDescription: string,
    professionalTitle: string,
    companyTitles: string[],
    apiKeys?: UserApiKeys,
    model = DEFAULT_TITLE_MATCH_MODEL,
  ) {
    const userPrompt = [
      `Job Description:\n${cleanText(jobDescription)}`,
      `Professional Title: ${professionalTitle}`,
      `Company Titles:\n${companyTitles.map((t) => `- ${t}`).join('\n')}`,
    ].join('\n\n');

    const systemPrompt = `${DEFAULT_TITLE_MATCH_PROMPT}\n\nSchema:\n${JSON.stringify(titleMatchJsonSchema)}`;

    const { data } = await this.openRouterService.createJsonCompletion<unknown>(
      systemPrompt,
      userPrompt,
      model,
      TITLE_MATCH_MAX_TOKENS,
      apiKeys,
    );

    const match = parseTitleMatchResult(data);
    const finalTitle = resolveFinalTitle(
      professionalTitle,
      match,
      TITLE_SIMILARITY_THRESHOLD,
    );

    return { match, finalTitle };
  }

  async extractJdRequirements(
    jobDescription: string,
    apiKeys?: UserApiKeys,
    model = DEFAULT_JD_EXTRACTION_MODEL,
  ): Promise<JdAlignmentRequirements> {
    const systemPrompt = `${DEFAULT_JD_REQUIREMENTS_PROMPT}\n\nSchema:\n${JSON.stringify(jdRequirementsJsonSchema)}`;

    const { data } = await this.openRouterService.createJsonCompletion<unknown>(
      systemPrompt,
      `Job Description:\n${cleanText(jobDescription)}`,
      model,
      JD_EXTRACTION_MAX_TOKENS,
      apiKeys,
    );

    return parseJdRequirementsResult(data, jobDescription);
  }

  async generateSummaryChunk(
    jobContext: string,
    finalTitle: string,
    companySummaries: string[],
    userInstructions: string | undefined,
    apiKeys?: UserApiKeys,
    model = DEFAULT_SUMMARY_MODEL,
    yearsOfExperience?: number | null,
  ) {
    const parts = [
      `Job Context:\n${cleanText(jobContext)}`,
      `Resume Title: ${finalTitle}`,
      `Companies:\n${companySummaries.join('\n')}`,
    ];
    if (yearsOfExperience != null) {
      parts.push(
        `Years of experience (MANDATORY — use exactly this number): ${yearsOfExperience}+ years of experience`,
      );
    }
    if (userInstructions?.trim()) {
      parts.push(`Additional Instructions:\n${cleanText(userInstructions)}`);
    }

    const systemPrompt = `${DEFAULT_SUMMARY_PROMPT}\n\nSchema:\n${JSON.stringify(summaryJsonSchema)}`;

    const { data } = await this.openRouterService.createJsonCompletion<unknown>(
      systemPrompt,
      parts.join('\n\n'),
      model,
      SUMMARY_MAX_TOKENS,
      apiKeys,
    );

    const parsed = parseSummaryResult(data);
    if (yearsOfExperience != null) {
      return {
        summary: applySummaryExperienceYears(parsed.summary, yearsOfExperience),
      };
    }
    return parsed;
  }

  async generateSkillsChunk(
    jobContext: string,
    baselineSkills: CandidateProfileData['baselineSkills'],
    resumeSettings: ResumeSettings,
    apiKeys?: UserApiKeys,
    model = DEFAULT_SKILLS_MODEL,
    context?: SkillsGenerationContext,
  ) {
    const settings = resolveResumeSettings(resumeSettings);
    const targetCategories = settings.skillCategories.length;

    const userPromptParts = [
      `Job Context:\n${cleanText(jobContext)}`,
      `Baseline Skills:\n${JSON.stringify(baselineSkills)}`,
    ];

    if (context?.companies.length) {
      userPromptParts.push(
        `Company Context and Role-Proven Skills:\n${JSON.stringify(context.companies)}`,
      );
    }

    userPromptParts.push(
      `Output goals:
- Enabled categories: ${settings.skillCategories.join(', ')}
- Be RICH: include all supported skills from baseline and role-proven lists
- ${
        settings.skillsPerCategoryCount > 0
          ? `Optional soft max ${settings.skillsPerCategoryCount} items per category`
          : 'No per-category item limit — include every supported skill'
      }
- Populate as many relevant enabled categories as possible (~${targetCategories} when supported)`,
    );

    const skillsSchema = buildSkillsJsonSchema({
      skillCategories: settings.skillCategories,
      skillsPerCategoryCount: settings.skillsPerCategoryCount,
    });
    const systemPrompt = `${DEFAULT_SKILLS_PROMPT}\n\nSchema:\n${JSON.stringify(skillsSchema)}`;

    const { data } = await this.openRouterService.createJsonCompletion<unknown>(
      systemPrompt,
      userPromptParts.join('\n\n'),
      model,
      SKILLS_MAX_TOKENS,
      apiKeys,
    );

    const roleSkills = (context?.companies ?? []).flatMap(
      (company) => company.roleSkills ?? [],
    );

    let parsedSkills: Array<{ category: string; items: string[] }> = [];
    try {
      parsedSkills = parseSkillsResult(data).skills;
    } catch (error) {
      console.warn(
        'Skills model returned an unusable payload; falling back to baseline/role skills.',
        error instanceof Error ? error.message : error,
        typeof data === 'object' ? JSON.stringify(data).slice(0, 500) : data,
      );
      parsedSkills = buildSkillsFallback(baselineSkills, roleSkills);
    }

    if (parsedSkills.length === 0) {
      parsedSkills = buildSkillsFallback(baselineSkills, roleSkills);
    }

    if (parsedSkills.length === 0) {
      throw new Error(
        'Invalid skills response: model returned no skills and profile baseline skills are empty. Add baseline skills in Profile → Candidate, then retry.',
      );
    }

    return {
      skills: enrichSkillsWithSources(
        normalizeGeneratedSkills(parsedSkills, settings),
        {
          baselineSkills,
          roleSkills,
        },
        settings,
      ),
    };
  }

  async generateCompanyExperience(
    jobDescription: string,
    company: CompanyEntry,
    systemInstructions: string,
    apiKeys?: UserApiKeys,
    model = DEFAULT_EXPERIENCE_MODEL,
    options?: {
      jdAlignment: JdAlignmentRequirements;
      isMostRecent: boolean;
      companySkillsCount?: number;
    },
  ) {
    const jdAlignment = options?.jdAlignment;
    const isMostRecent = options?.isMostRecent ?? false;

    let jdExcerpt = '';
    if (isMostRecent) {
      const jd = cleanText(jobDescription);
      jdExcerpt =
        jd.length > JD_MOST_RECENT_EXCERPT_CHARS
          ? jd.slice(0, JD_MOST_RECENT_EXCERPT_CHARS)
          : jd;
    }

    const userPromptParts = [
      jdAlignment
        ? buildExperienceAlignmentUserBlock({
            alignment: jdAlignment,
            isMostRecent,
            jobDescriptionExcerpt: jdExcerpt,
          })
        : `Job Description:\n${cleanText(jobDescription).slice(0, JD_MOST_RECENT_EXCERPT_CHARS)}`,
      `Company Context:\n${JSON.stringify({
        company: company.company,
        title: company.title,
        date_range: company.date_range,
        job_type: company.job_type,
        location: company.location,
        product: company.product,
        mission: company.mission,
        context: company.context,
        isMostRecentRole: isMostRecent,
      })}`,
    ];

    const { data } = await this.openRouterService.createJsonCompletion<unknown>(
      systemInstructions,
      userPromptParts.join('\n\n'),
      model,
      EXPERIENCE_MAX_TOKENS,
      apiKeys,
    );

    const parsed = parseExperienceResult(data);

    if (!jdAlignment) {
      return parsed;
    }

    return alignExperienceResultWithJd(parsed, {
      isMostRecent,
      languages: jdAlignment.languages,
      requiredSkills: jdAlignment.requiredSkills,
      companySkillsCount: options?.companySkillsCount,
    });
  }

  buildExperienceSystemInstructions(options: {
    experiencePrompt?: string | null;
    industryOverlay?: string | null;
    companySkillsCount?: number;
    achievementsCount?: number;
  }): string {
    return prepareCompanyExperienceInstructions(options);
  }

  async generateCoverLetter(
    jobDescription: string,
    resumeJson: Record<string, unknown>,
    _conversationId: string | undefined,
    aiProvider: string = 'anthropic',
    aiVersion: string = 'anthropic/claude-sonnet-4.6',
    apiKeys?: UserApiKeys,
    customPrompt?: string,
  ): Promise<string> {
    const cleanedJobDescription = cleanText(jobDescription);
    const compactResumeJson = JSON.stringify(resumeJson);
    const coverLetterInstructions = cleanText(
      customPrompt?.trim() || DEFAULT_COVER_LETTER_PROMPT,
    );
    const apiModelId = resolveApiModelId(aiProvider, aiVersion);

    return this.openRouterService.generateCoverLetter(
      cleanedJobDescription,
      compactResumeJson,
      coverLetterInstructions,
      apiModelId,
      apiKeys,
    );
  }

  async parseAndAnswerQuestions(
    questionsText: string,
    resumeJson: Record<string, unknown>,
    jobDescription: string,
    customPrompt?: string,
    aiProvider: string = 'anthropic',
    aiVersion: string = 'anthropic/claude-sonnet-4.6',
    apiKeys?: UserApiKeys,
  ): Promise<Array<{ question: string; answer: string }>> {
    const answerFormatRules = `ANSWER FORMAT (MANDATORY)
- Return JSON only. Never write an email, cover letter, subject line, or greeting.
- Extract every application question from the user text and answer each one.
- At most 3 sentences per answer
- If giving 2–3 points, structure as: First, ... Second, ... Third, ...
- If giving one point, write one normal sentence with no First/Second/Third prefix`;

    const instructions = [
      cleanText(customPrompt?.trim() || DEFAULT_QUESTIONS_PROMPT),
      answerFormatRules,
    ].join('\n\n');

    const cleanedJobDescription = cleanText(jobDescription);
    const cleanedQuestionsText = cleanText(questionsText);

    const resumeCopy: Record<string, unknown> = { ...(resumeJson || {}) };
    if (resumeCopy.cover_letter) {
      delete resumeCopy.cover_letter;
    }

    const compactResumeJson = JSON.stringify(resumeCopy);
    const fullInstructions = `${instructions} Job Description: ${cleanedJobDescription} Resume Information: ${compactResumeJson}`;
    const apiModelId = resolveApiModelId(aiProvider, aiVersion);

    return this.openRouterService.parseAndAnswerQuestions(
      cleanedQuestionsText,
      fullInstructions,
      apiModelId,
      apiKeys,
    );
  }
}