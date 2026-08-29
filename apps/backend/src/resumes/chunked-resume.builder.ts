import { Injectable, BadRequestException } from '@nestjs/common';
import {
  validateCandidateProfile,
  DEFAULT_SUMMARY_MODEL,
  DEFAULT_TITLE_MATCH_MODEL,
  DEFAULT_SKILLS_MODEL,
  DEFAULT_EXPERIENCE_MODEL,
  EXPERIENCE_MODEL_FALLBACK,
  EXPERIENCE_CONCURRENCY_LIMIT,
  sortCompaniesByOrder,
  type CompanyEntry,
} from '@resume-builder/shared';
import { AiService } from '../ai/ai.service';
import { OpenRouterModelsService } from '../ai/openrouter-models.service';
import { assembleResumeJson } from '../ai/assemble-resume-json';
import { normalizeResumeExperienceBullets } from '../ai/normalize-resume-json';
import type { UserApiKeys } from '../ai/user-api-keys';
import type { ResumeSettings } from '../ai/resume-settings';
import { PromptRegistryService } from './prompt-registry.service';
import { ResumesGateway } from './resumes.gateway';

export interface GenerationStepMeta {
  step: string;
  model: string;
  company?: string;
}

export interface ChunkedGenerationResult {
  resumeJson: ReturnType<typeof normalizeResumeExperienceBullets>;
  threadId: string;
  generationMeta: {
    chunked: true;
    steps: GenerationStepMeta[];
  };
}

@Injectable()
export class ChunkedResumeBuilder {
  constructor(
    private readonly aiService: AiService,
    private readonly modelsService: OpenRouterModelsService,
    private readonly promptRegistry: PromptRegistryService,
    private readonly gateway: ResumesGateway,
  ) {}

  private async resolveModelId(
    preferred: string,
    fallback: string,
  ): Promise<string> {
    try {
      const catalog = await this.modelsService.getCatalog();
      const allIds = catalog.providers.flatMap((p) => p.models.map((m) => m.id));
      if (allIds.includes(preferred)) {
        return preferred;
      }
      if (allIds.includes(fallback)) {
        console.warn(
          `Model ${preferred} not in catalog; falling back to ${fallback}`,
        );
        return fallback;
      }
    } catch {
      // use preferred if catalog fetch fails
    }
    return preferred;
  }

  private async runWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let nextIndex = 0;

    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (nextIndex < items.length) {
        const current = nextIndex++;
        results[current] = await fn(items[current], current);
      }
    });

    await Promise.all(workers);
    return results;
  }

  async run(options: {
    resumeId: string;
    jobDescription: string;
    user: {
      name: string;
      contacts: Parameters<typeof assembleResumeJson>[0]['contacts'];
      candidateProfile: Parameters<typeof assembleResumeJson>[0]['candidateProfile'];
      companies: CompanyEntry[];
      instructions?: string;
      experiencePrompt?: string;
    };
    industry?: string;
    apiKeys: UserApiKeys;
    resumeSettings: ResumeSettings;
  }): Promise<ChunkedGenerationResult> {
    const validation = validateCandidateProfile({
      name: options.user.name,
      contacts: options.user.contacts,
      candidateProfile: options.user.candidateProfile,
      companies: options.user.companies,
    });

    if (!validation.valid) {
      throw new BadRequestException(
        `Profile incomplete: ${validation.errors.join('; ')}`,
      );
    }

    const steps: GenerationStepMeta[] = [];
    const sortedCompanies = sortCompaniesByOrder(options.user.companies);

    const titleModel = await this.resolveModelId(
      DEFAULT_TITLE_MATCH_MODEL,
      DEFAULT_TITLE_MATCH_MODEL,
    );
    this.gateway.emitProgress(options.resumeId, { step: 'title' });

    const { finalTitle } = await this.aiService.matchTitle(
      options.jobDescription,
      options.user.candidateProfile.professionalTitle,
      sortedCompanies.map((c) => c.title),
      options.apiKeys,
      titleModel,
    );
    steps.push({ step: 'title', model: titleModel });

    const summaryModel = await this.resolveModelId(
      DEFAULT_SUMMARY_MODEL,
      DEFAULT_SUMMARY_MODEL,
    );
    this.gateway.emitProgress(options.resumeId, { step: 'summary' });

    const companySummaries = sortedCompanies.map(
      (c) => `${c.company}: ${c.product}`,
    );
    const summaryResult = await this.aiService.generateSummaryChunk(
      options.jobDescription,
      finalTitle,
      companySummaries,
      options.user.instructions,
      options.apiKeys,
      summaryModel,
    );
    steps.push({ step: 'summary', model: summaryModel });

    const experienceModel = await this.resolveModelId(
      DEFAULT_EXPERIENCE_MODEL,
      EXPERIENCE_MODEL_FALLBACK,
    );
    const industryOverlay = this.promptRegistry.getIndustryOverlay(
      options.industry,
    );
    const experienceSystem = this.aiService.buildExperienceSystemInstructions({
      experiencePrompt: options.user.experiencePrompt,
      industryOverlay,
      companySkillsCount: options.resumeSettings.companySkillsCount,
      achievementsCount: options.resumeSettings.achievementsCount,
    });

    const total = sortedCompanies.length;
    const experienceByCompanyId = new Map<
      string,
      Awaited<ReturnType<AiService['generateCompanyExperience']>>
    >();

    await this.runWithConcurrency(
      sortedCompanies,
      EXPERIENCE_CONCURRENCY_LIMIT,
      async (company, index) => {
        this.gateway.emitProgress(options.resumeId, {
          step: 'experience',
          index: index + 1,
          total,
        });

        try {
          const result = await this.aiService.generateCompanyExperience(
            options.jobDescription,
            company,
            experienceSystem,
            options.apiKeys,
            experienceModel,
          );
          experienceByCompanyId.set(company.id, result);
          steps.push({
            step: 'experience',
            model: experienceModel,
            company: company.company,
          });
          return result;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          throw new Error(
            `Experience generation failed for ${company.company}: ${message}`,
          );
        }
      },
    );

    const skillsModel = await this.resolveModelId(
      DEFAULT_SKILLS_MODEL,
      DEFAULT_SKILLS_MODEL,
    );
    this.gateway.emitProgress(options.resumeId, { step: 'skills' });

    const skillsContext = {
      companies: sortedCompanies.map((company) => ({
        company: company.company,
        title: company.title,
        product: company.product,
        mission: company.mission,
        roleSkills: experienceByCompanyId.get(company.id)?.skills ?? [],
      })),
    };

    const skillsResult = await this.aiService.generateSkillsChunk(
      options.jobDescription,
      options.user.candidateProfile.baselineSkills,
      options.resumeSettings,
      options.apiKeys,
      skillsModel,
      skillsContext,
    );
    steps.push({ step: 'skills', model: skillsModel });

    const assembled = assembleResumeJson({
      name: options.user.name,
      contacts: options.user.contacts,
      candidateProfile: options.user.candidateProfile,
      companies: options.user.companies,
      finalTitle,
      summary: summaryResult.summary,
      skills: skillsResult.skills,
      experienceByCompanyId,
    });

    const resumeJson = normalizeResumeExperienceBullets(
      assembled,
      options.resumeSettings.achievementsCount,
      options.resumeSettings.companySkillsCount,
    );

    return {
      resumeJson,
      threadId: `chunked-${options.resumeId}`,
      generationMeta: { chunked: true, steps },
    };
  }
}
