import { Injectable } from '@nestjs/common';
import { resolveApiModelId } from './ai-models';
import type { ResumeSettings } from './resume-settings';
import { resolveResumeSettings } from './resume-settings';
import {
  DEFAULT_COVER_LETTER_PROMPT,
  DEFAULT_QUESTIONS_PROMPT,
  DEFAULT_TITLE_MATCH_PROMPT,
  DEFAULT_JD_REQUIREMENTS_PROMPT,
  DEFAULT_SUMMARY_PROMPT,
  DEFAULT_SKILLS_PROMPT,
  DEFAULT_EXPERIENCE_SKILLS_PROMPT,
  DEFAULT_TITLE_MATCH_MODEL,
  DEFAULT_JD_EXTRACTION_MODEL,
  DEFAULT_SUMMARY_MODEL,
  DEFAULT_SKILLS_MODEL,
  DEFAULT_EXPERIENCE_MODEL,
  DEFAULT_EXPERIENCE_SKILLS_MODEL,
  TITLE_MATCH_MAX_TOKENS,
  JD_EXTRACTION_MAX_TOKENS,
  SUMMARY_MAX_TOKENS,
  SKILLS_MAX_TOKENS,
  EXPERIENCE_MAX_TOKENS,
  EXPERIENCE_SKILLS_MAX_TOKENS,
  MIN_SKILLS_PER_CATEGORY,
  type CompanyEntry,
  type CandidateProfileData,
  type JdAlignmentRequirements,
  buildExperienceAlignmentUserBlock,
  JD_MOST_RECENT_EXCERPT_CHARS,
  applySummaryExperienceYears,
} from '@resume-builder/shared';
import { cleanText } from './clean-text';
import { buildSummaryChunkUserPrompt } from './generate-summary-prompt';
import type { UserApiKeys } from './user-api-keys';
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
} from './schemas/experience.schema';
import {
  prepareCompanyExperienceInstructions,
  stripCompanyNameFromBullets,
} from './prepare-company-experience-instructions';
import {
  buildExperienceSkillsUserPrompt,
  buildEvidenceBasedSkillsFallback,
  finalizeCompanyExperienceSkills,
} from './generate-company-experience-skills';
import {
  experienceSkillsJsonSchema,
  parseExperienceSkillsResult,
} from './schemas/experience-skills.schema';
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
    const finalTitle = resolveFinalTitle(professionalTitle, match);

    return { match, finalTitle };
  }

  async extractJdRequirements(
    jobDescription: string,
    apiKeys?: UserApiKeys,
    _model = DEFAULT_JD_EXTRACTION_MODEL,
  ): Promise<JdAlignmentRequirements> {
    const systemPrompt = `${DEFAULT_JD_REQUIREMENTS_PROMPT}\n\nSchema:\n${JSON.stringify(jdRequirementsJsonSchema)}`;

    const { data } = await this.openRouterService.createJsonCompletion<unknown>(
      systemPrompt,
      `Job Description:\n${cleanText(jobDescription)}`,
      DEFAULT_JD_EXTRACTION_MODEL,
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
    mandatorySkills: string[] = [],
    keyModernSkills: string[] = [],
    mandatoryExperience: string[] = [],
  ) {
    const userPrompt = buildSummaryChunkUserPrompt({
      jobContext,
      finalTitle,
      companySummaries,
      yearsOfExperience,
      mandatorySkills,
      keyModernSkills,
      mandatoryExperience,
      userInstructions,
    });

    const systemPrompt = `${DEFAULT_SUMMARY_PROMPT}\n\nSchema:\n${JSON.stringify(summaryJsonSchema)}`;

    const { data } = await this.openRouterService.createJsonCompletion<unknown>(
      systemPrompt,
      userPrompt,
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
    jdSkills?: string[],
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

    if (jdSkills?.length) {
      userPromptParts.push(
        `JD Skills (include ALL in Core Technologies when enabled):\n${jdSkills.join(', ')}`,
      );
    }

    userPromptParts.push(
      `Output goals:
- Enabled categories: ${settings.skillCategories.join(', ')}
- ${
        settings.skillsPerCategoryCount > 0
          ? `Each included category: ${MIN_SKILLS_PER_CATEGORY}–${settings.skillsPerCategoryCount} skills (min ${MIN_SKILLS_PER_CATEGORY}, max ${settings.skillsPerCategoryCount})`
          : 'No per-category item limit — include every supported skill'
      }
- Do NOT pad every category to the same count. Sizes must vary within the min–max range.
- Include JD skills and other supported skills only; never invent filler
- Use only relevant enabled categories (up to ${targetCategories}); omit empty ones`,
    );

    const skillsSchema = buildSkillsJsonSchema({
      skillCategories: settings.skillCategories,
      skillsPerCategoryCount: settings.skillsPerCategoryCount,
      minSkillsPerCategory: MIN_SKILLS_PER_CATEGORY,
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
          jdSkills: settings.includeJdSkillsInCoreTechnologies ? jdSkills : undefined,
        },
        settings,
      ),
    };
  }

  async generateCompanyExperienceSkills(
    company: CompanyEntry,
    achievements: string[],
    apiKeys?: UserApiKeys,
    model = DEFAULT_EXPERIENCE_SKILLS_MODEL,
    options?: {
      companySkillsCount?: number;
      isMostRecent?: boolean;
      recencyRank?: number;
      jdAlignment?: JdAlignmentRequirements;
      jobDescriptionExcerpt?: string;
      keyModernSkills?: string[];
      assignedJdSkills?: string[];
    },
  ): Promise<string[]> {
    const companySkillsCount = options?.companySkillsCount ?? 0;
    const skillExtras = {
      keyModernSkills: options?.keyModernSkills,
      mandatoryJdSkills: options?.assignedJdSkills,
    };

    if (achievements.length === 0) {
      return [];
    }

    try {
      const systemPrompt = `${DEFAULT_EXPERIENCE_SKILLS_PROMPT}\n\nSchema:\n${JSON.stringify(experienceSkillsJsonSchema)}`;
      const userPrompt = buildExperienceSkillsUserPrompt({
        company,
        achievements,
        companySkillsCount,
        isMostRecent: options?.isMostRecent,
        recencyRank: options?.recencyRank,
        jdAlignment: options?.jdAlignment,
        jobDescriptionExcerpt: options?.jobDescriptionExcerpt,
        keyModernSkills: options?.keyModernSkills,
        assignedJdSkills: options?.assignedJdSkills,
      });

      const { data } = await this.openRouterService.createJsonCompletion<unknown>(
        systemPrompt,
        userPrompt,
        model,
        EXPERIENCE_SKILLS_MAX_TOKENS,
        apiKeys,
      );

      const parsed = parseExperienceSkillsResult(data);
      return finalizeCompanyExperienceSkills(
        parsed.skills,
        achievements,
        companySkillsCount,
        skillExtras,
      );
    } catch (error) {
      console.warn(
        `Experience skills generation failed for ${company.company}; using evidence-based fallback.`,
        error,
      );
      return buildEvidenceBasedSkillsFallback(
        achievements,
        options?.jdAlignment,
        companySkillsCount,
        skillExtras,
      );
    }
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
      recencyRank?: number;
      assignedJdSkills?: string[];
      keyModernSkills?: string[];
      companySkillsCount?: number;
      achievementsCount?: number;
      experienceSkillsModel?: string;
    },
  ) {
    const jdAlignment = options?.jdAlignment;
    const isMostRecent = options?.isMostRecent ?? false;
    const recencyRank = options?.recencyRank ?? (isMostRecent ? 0 : 1);
    const assignedJdSkills = options?.assignedJdSkills ?? [];
    const keyModernSkills = options?.keyModernSkills ?? [];
    const targetAchievements =
      options?.achievementsCount && options.achievementsCount > 0
        ? options.achievementsCount
        : 6;
    // Accept a near-miss after filtering false pads; retry below this.
    const minAcceptableAchievements = Math.max(4, targetAchievements - 1);

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
            recencyRank,
            assignedJdSkills,
            keyModernSkills,
            jobDescriptionExcerpt: jdExcerpt,
            company: {
              title: company.title,
              product: company.product,
              mission: company.mission,
              job_type: company.job_type,
              context: company.context,
            },
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
        keyModernSkills,
        assignedJdSkillsToAdd: assignedJdSkills,
        ...(isMostRecent
          ? {
              mandatoryJdExperience: jdAlignment
                ? [
                    ...jdAlignment.experienceRequirements,
                    ...jdAlignment.experienceThemes,
                  ]
                : [],
            }
          : {}),
      })}`,
    ];

    const runOnce = async (extraReminder?: string) => {
      const userPrompt = [
        ...userPromptParts,
        extraReminder ? `CRITICAL RETRY:\n${extraReminder}` : '',
      ]
        .filter(Boolean)
        .join('\n\n');

      const { data } = await this.openRouterService.createJsonCompletion<unknown>(
        systemInstructions,
        userPrompt,
        model,
        EXPERIENCE_MAX_TOKENS,
        apiKeys,
      );

      return parseExperienceResult(data);
    };

    let parsed = await runOnce();
    if (parsed.achievements.length < minAcceptableAchievements) {
      console.warn(
        `Experience for ${company.company} returned ${parsed.achievements.length}/${targetAchievements} usable bullets; retrying once.`,
      );
      parsed = await runOnce(
        `Return exactly ${targetAchievements} achievement strings. Every item must be a full sentence. Do not use true, false, null, or empty placeholders. Do not include the company name. Do not change the official job title. Keep this company's main product as the bullet content and keep modern skillsets from the candidate skill set. Customize toward the JD. No gap-fill or weak evidence. Include credible numeric improvements in exactly 1-2 bullets; no metrics in the rest. ADD these mandatory skills into that product work with modern skillsets (do not replace bullets with this list): ${assignedJdSkills.join(', ') || 'must-have JD technologies'}.${
          isMostRecent
            ? ' Most recent role: also include the mandatory JD experience realistically on this product.'
            : ''
        }`,
      );
    }

    if (parsed.achievements.length < minAcceptableAchievements) {
      throw new Error(
        `Experience generation for ${company.company} returned only ${parsed.achievements.length} usable bullets (need at least ${minAcceptableAchievements}).`,
      );
    }

    const achievements = stripCompanyNameFromBullets(
      parsed.achievements,
      company.company,
    );
    const skills = await this.generateCompanyExperienceSkills(
      company,
      achievements,
      apiKeys,
      options?.experienceSkillsModel ?? DEFAULT_EXPERIENCE_SKILLS_MODEL,
      {
        companySkillsCount: options?.companySkillsCount,
        isMostRecent,
        recencyRank,
        jdAlignment,
        jobDescriptionExcerpt: jdExcerpt,
        keyModernSkills,
        assignedJdSkills,
      },
    );

    return {
      achievements,
      skills,
    };
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