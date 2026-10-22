import { Injectable } from '@nestjs/common';
import { cleanText } from '../ai/clean-text';
import { extractJsonText } from '../ai/extract-json-text';
import { parseQuestionsResponse } from '../ai/parse-questions-response';
import type { UserApiKeys } from '../ai/user-api-keys';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_APP_TITLE = 'Resume Builder';
const OPENROUTER_MAX_ATTEMPTS = 4;
const OPENROUTER_RETRY_BASE_MS = 1000;

interface ChatCompletionMessage {
  content?: string | null;
}

interface ChatCompletionChoice {
  message?: ChatCompletionMessage;
}

interface ChatCompletion {
  id: string;
  choices: ChatCompletionChoice[];
}

export interface OpenRouterKeyUsage {
  label: string | null;
  usage: number;
  usageDaily: number;
  usageWeekly: number;
  usageMonthly: number;
  limit: number | null;
  limitRemaining: number | null;
}

type OpenRouterErrorBody = {
  error?: {
    message?: string;
    code?: number | string;
    metadata?: {
      provider_name?: string;
      raw?: unknown;
    };
  };
};

@Injectable()
export class OpenRouterService {
  private resolveApiKey(apiKeys?: UserApiKeys): string {
    const key = apiKeys?.openrouter?.trim();
    if (!key) {
      throw new Error(
        'No OpenRouter API key configured. Add your OpenRouter API key in Profile settings.',
      );
    }
    return key;
  }

  private buildApiError(
    status: number,
    body: OpenRouterErrorBody,
  ): Error {
    const message = body.error?.message ?? 'OpenRouter request failed';
    const provider = body.error?.metadata?.provider_name;
    const raw = body.error?.metadata?.raw;
    const rawText =
      typeof raw === 'string'
        ? raw
        : raw
          ? JSON.stringify(raw)
          : '';

    const details = [
      `${status} ${message}`,
      provider ? `Provider: ${provider}` : '',
      rawText ? `Details: ${rawText}` : '',
    ]
      .filter(Boolean)
      .join(' — ');

    return new Error(details);
  }

  private isRetryableStructuredOutputError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return (
      /400[\s\S]*provider returned error/i.test(error.message) ||
      /Failed to parse JSON from AI response/i.test(error.message)
    );
  }

  private isRetryableTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message;
    return (
      /^429\b/.test(message) ||
      /\brate[_ ]?limit\b/i.test(message) ||
      /fetch failed/i.test(message) ||
      /networkerror|econnreset|etimedout|socket hang up/i.test(message)
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async createChatCompletion(
    apiKeys: UserApiKeys,
    body: Record<string, unknown>,
  ): Promise<ChatCompletion> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= OPENROUTER_MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.resolveApiKey(apiKeys)}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:5173',
            'X-OpenRouter-Title': OPENROUTER_APP_TITLE,
          },
          body: JSON.stringify(body),
        });

        const payload = (await response.json()) as
          | ChatCompletion
          | OpenRouterErrorBody;

        if (!response.ok) {
          const error = this.buildApiError(
            response.status,
            payload as OpenRouterErrorBody,
          );
          if (
            attempt < OPENROUTER_MAX_ATTEMPTS &&
            this.isRetryableTransientError(error)
          ) {
            lastError = error;
            const delay =
              OPENROUTER_RETRY_BASE_MS * 2 ** (attempt - 1) +
              Math.floor(Math.random() * 250);
            console.warn(
              `OpenRouter transient error (attempt ${attempt}/${OPENROUTER_MAX_ATTEMPTS}): ${error.message}. Retrying in ${delay}ms`,
            );
            await this.sleep(delay);
            continue;
          }
          throw error;
        }

        return payload as ChatCompletion;
      } catch (error) {
        lastError = error;
        if (
          attempt < OPENROUTER_MAX_ATTEMPTS &&
          this.isRetryableTransientError(error)
        ) {
          const delay =
            OPENROUTER_RETRY_BASE_MS * 2 ** (attempt - 1) +
            Math.floor(Math.random() * 250);
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(
            `OpenRouter request failed (attempt ${attempt}/${OPENROUTER_MAX_ATTEMPTS}): ${message}. Retrying in ${delay}ms`,
          );
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('OpenRouter request failed after retries');
  }

  private extractJsonText(outputText: string): string {
    return extractJsonText(outputText);
  }

  private getMessageContent(response: ChatCompletion): string {
    const content = response.choices[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error('No output text received from OpenRouter');
    }
    return content.trim();
  }

  private parseJsonResponse<T>(
    outputText: string,
    responseId: string,
  ): { data: T; responseId: string } {
    const jsonText = this.extractJsonText(outputText);

    try {
      return {
        data: JSON.parse(jsonText) as T,
        responseId,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse JSON from OpenRouter response: ${error.message}. Response: ${outputText.substring(0, 200)}`,
      );
    }
  }

  async createJsonCompletion<T>(
    systemPrompt: string,
    userPrompt: string,
    model: string,
    maxTokens: number,
    apiKeys?: UserApiKeys,
    strictRetry = true,
  ): Promise<{ data: T; responseId: string }> {
    const keys = apiKeys ?? {};
    const baseRequest = {
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: 'system', content: cleanText(systemPrompt) },
        { role: 'user', content: cleanText(userPrompt) },
      ],
      response_format: { type: 'json_object' as const },
    };

    try {
      const response = await this.createChatCompletion(keys, baseRequest);
      return this.parseJsonResponse<T>(
        this.getMessageContent(response),
        response.id,
      );
    } catch (error) {
      if (!strictRetry || !this.isRetryableStructuredOutputError(error)) {
        throw error;
      }
    }

    const fallbackResponse = await this.createChatCompletion(keys, {
      ...baseRequest,
      messages: [
        {
          role: 'system',
          content: `${cleanText(systemPrompt)}\n\nRespond with valid JSON only. No markdown or extra text.`,
        },
        { role: 'user', content: cleanText(userPrompt) },
      ],
    });

    return this.parseJsonResponse<T>(
      this.getMessageContent(fallbackResponse),
      fallbackResponse.id,
    );
  }

  async getKeyUsage(apiKeys?: UserApiKeys): Promise<OpenRouterKeyUsage> {
    const key = this.resolveApiKey(apiKeys);
    const response = await fetch(`${OPENROUTER_BASE_URL}/key`, {
      headers: { Authorization: `Bearer ${key}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OpenRouter API key usage');
    }

    const body = (await response.json()) as {
      data?: {
        label?: string;
        usage?: number;
        usage_daily?: number;
        usage_weekly?: number;
        usage_monthly?: number;
        limit?: number | null;
        limit_remaining?: number | null;
      };
    };

    const data = body.data ?? {};

    return {
      label: data.label ?? null,
      usage: data.usage ?? 0,
      usageDaily: data.usage_daily ?? 0,
      usageWeekly: data.usage_weekly ?? 0,
      usageMonthly: data.usage_monthly ?? 0,
      limit: data.limit ?? null,
      limitRemaining: data.limit_remaining ?? null,
    };
  }

  async generateCoverLetter(
    jobDescription: string,
    resumeJson: string,
    instructions: string,
    model: string,
    apiKeys?: UserApiKeys,
  ): Promise<string> {
    const response = await this.createChatCompletion(apiKeys ?? {}, {
      model,
      max_completion_tokens: 1800,
      messages: [
        { role: 'system', content: cleanText(instructions) },
        {
          role: 'user',
          content: `Job Description: ${cleanText(jobDescription)}\n\nResume JSON: ${resumeJson}\n\nGenerate the cover letter now.`,
        },
      ],
    });

    return this.getMessageContent(response);
  }

  async parseAndAnswerQuestions(
    questionsText: string,
    instructions: string,
    model: string,
    apiKeys?: UserApiKeys,
  ): Promise<Array<{ question: string; answer: string }>> {
    const keys = apiKeys ?? {};
    const jsonOnlyRule = `OUTPUT FORMAT (MANDATORY)
Return valid JSON only. No markdown, no emails, no subject lines, no cover letters, no greeting.
Shape: {"questions_and_answers":[{"question":"...","answer":"..."}]}
Extract every application question from the user text (including questions inside emails or forms) and answer each one.
Treat each numbered item or non-empty line as its own question even when it does not end with "?".`;
    const userContent = `Extract and answer the application questions in the text below. Do not write an email or cover letter.\nQuestions may be one per line and may not end with "?". Answer each separately.\n\n${questionsText}`;
    const systemContent = `${instructions}\n\n${jsonOnlyRule}`;
    const questionsSchema = {
      type: 'object',
      properties: {
        questions_and_answers: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              question: {
                type: 'string',
                minLength: 1,
              },
              answer: {
                type: 'string',
                minLength: 1,
              },
            },
            required: ['question', 'answer'],
            additionalProperties: false,
          },
        },
      },
      required: ['questions_and_answers'],
      additionalProperties: false,
    };

    const structuredRequest = {
      model,
      max_completion_tokens: 8192,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'questions_and_answers',
          strict: true,
          schema: questionsSchema,
        },
      },
      provider: {
        require_parameters: true,
      },
    };

    try {
      const response = await this.createChatCompletion(keys, structuredRequest);
      const outputText = this.getMessageContent(response);
      return parseQuestionsResponse(outputText);
    } catch (error) {
      if (!this.isRetryableStructuredOutputError(error)) {
        throw error;
      }
    }

    try {
      const fallbackResponse = await this.createChatCompletion(keys, {
        model,
        max_completion_tokens: 8192,
        messages: [
          {
            role: 'system',
            content: `${systemContent}\n\nRespond with valid JSON only in this format: {"questions_and_answers": [{"question": "...", "answer": "..."}]}`,
          },
          { role: 'user', content: userContent },
        ],
        response_format: {
          type: 'json_object',
        },
      });

      const outputText = this.getMessageContent(fallbackResponse);
      return parseQuestionsResponse(outputText);
    } catch {
      throw new Error(
        'The AI did not return application answers in the expected JSON format. Please try again.',
      );
    }
  }
}
