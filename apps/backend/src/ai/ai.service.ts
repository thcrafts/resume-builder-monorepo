import { Injectable } from '@nestjs/common';
import { ResumeData } from 'src/resumes/templates';
import { resolveApiModelId } from './ai-models';
import { buildResumeJsonSchema } from './resume-json-schema';
import type { ResumeSettings } from './resume-settings';
import { resolveResumeSettings } from './resume-settings';
import {
  DEFAULT_COVER_LETTER_PROMPT,
  DEFAULT_QUESTIONS_PROMPT,
} from './default-prompts';
import { cleanText } from './clean-text';
import { prepareResumeGenerationInstructions } from './prepare-resume-instructions';
import type { UserApiKeys } from './user-api-keys';
import { normalizeResumeExperienceBullets } from './normalize-resume-json';
import { OpenRouterService } from '../openrouter/openrouter.service';

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
    resumeJson: Record<string, any>,
    jobDescription: string,
    customPrompt?: string,
    aiProvider: string = 'anthropic',
    aiVersion: string = 'anthropic/claude-sonnet-4.6',
    apiKeys?: UserApiKeys,
  ): Promise<Array<{ question: string; answer: string }>> {
    const answerFormatRules = `ANSWER FORMAT (MANDATORY)
- At most 3 sentences total
- If giving 2–3 points, structure as: First, ... Second, ... Third, ...
- If giving one point, write one normal sentence with no First/Second/Third prefix`;

    const instructions = [
      cleanText(customPrompt?.trim() || DEFAULT_QUESTIONS_PROMPT),
      answerFormatRules,
    ].join('\n\n');

    const cleanedJobDescription = cleanText(jobDescription);
    const cleanedQuestionsText = cleanText(questionsText);

    const resumeCopy: Record<string, any> = { ...(resumeJson || {}) };
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
