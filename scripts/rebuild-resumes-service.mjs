import fs from 'node:fs';

const src = fs.readFileSync(
  'apps/backend/src/resumes/resumes.service.ts',
  'utf8',
);

const lines = src.split('\n');

// Keep lines 1-271 (through updateResumeWithGeneratedData closing brace)
const head = lines.slice(0, 271).join('\n');

// Keep parseAndAnswerQuestions through extractEmail (original lines 3028-3109, 0-indexed 3027-3108)
const middle = lines.slice(3027, 3109).join('\n');

// Keep from generateTemplatePreviewPdf (line 3111, index 3110) to normalizeCoverLetterText end (3281)
const tailStart = lines.slice(3110, 3282).join('\n');

// Keep download methods from 3388
const tailEnd = lines.slice(3387).join('\n');

const coverLetterMethods = `
  async generateCoverLetterForResume(
    id: string,
    userId: string,
  ): Promise<{ pdfBuffer: Buffer; userName: string }> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();

    if (!resume) {
      throw new NotFoundException(\`Resume with id \${id} not found\`);
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(\`User with ID \${userId} not found\`);
    }

    if (!user.name?.trim()) {
      throw new NotFoundException('User name not found');
    }

    const existingCoverLetter = resume.coverLetter
      ? this.coverLetterPdfService.normalizeCoverLetterText(resume.coverLetter)
      : '';

    let formattedCoverLetter = existingCoverLetter;

    if (!formattedCoverLetter) {
      if (!resume.jobDescription?.trim()) {
        throw new BadRequestException(
          'Job description not found for this resume',
        );
      }

      const resumeJson = await this.getResumeJson(id, userId);
      const aiModel = resume.aiModel || 'anthropic';

      await this.validateApiKeyForGeneration(userId);

      const apiKeys = await this.usersService.getApiKeysForUser(userId);
      const coverLetterText = await this.aiService.generateCoverLetter(
        resume.jobDescription,
        resumeJson as unknown as Record<string, unknown>,
        resume.conversationId,
        aiModel,
        resume.aiVersion || 'anthropic/claude-sonnet-4.6',
        apiKeys,
        user.coverLetterPrompt,
      );

      formattedCoverLetter =
        this.coverLetterPdfService.normalizeCoverLetterText(coverLetterText);
      await this.updateCoverLetter(id, userId, formattedCoverLetter);
    }

    const pdfBuffer = await this.coverLetterPdfService.generatePdf(
      user.name,
      formattedCoverLetter,
      resume.createdAt,
    );

    return {
      pdfBuffer,
      userName: user.name,
    };
  }

  async downloadCoverLetterPDF(
    id: string,
    userId: string,
  ): Promise<Buffer> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();

    if (!resume) {
      throw new NotFoundException(\`Resume with id \${id} not found\`);
    }

    if (!resume.coverLetter) {
      throw new NotFoundException('Cover letter not found for this resume');
    }

    if (!resume.userId) {
      throw new NotFoundException('Cover letter not found for this resume');
    }

    const user = await this.userModel.findOne({ _id: resume?.userId }).exec();

    if (!user) {
      throw new NotFoundException('User not found for this resume');
    }

    if (!user.name) {
      throw new NotFoundException('User name not found for this resume');
    }

    const coverLetterText = this.coverLetterPdfService.normalizeCoverLetterText(
      resume.coverLetter,
    );

    return this.coverLetterPdfService.generatePdf(
      user.name,
      coverLetterText,
      resume.createdAt,
    );
  }
`;

const imports = `import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { InjectModel } from '@nestjs/mongoose';
import { ResumesGateway } from './resumes.gateway';
import { Model } from 'mongoose';

import { Resume } from './schemas/resume.schema';
import { User } from '../users/schemas/user.schema';
import {
  ResumeData,
  ResumePDFTemplate1,
  ResumePDFTemplate2,
  ResumePDFTemplate3,
  ResumePDFTemplate4,
  ResumePDFTemplate5,
  ResumePDFTemplate6,
  ResumePDFTemplate7,
} from './templates';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { CoverLetterPdfService } from './cover-letter-pdf.service';
import { ResumeGenerationService } from './resume-generation.service';
import { formatAiProviderError } from '../ai/format-ai-error';
import {
  DEFAULT_RESUME_PDF_SETTINGS,
  getResumePdfSettings,
  type ResumePdfSettings,
} from '../ai/resume-settings';
import { isValidTemplate } from '@resume-builder/shared';

const SAMPLE_RESUME_JSON_PATH = join(
  process.cwd(),
  'assets',
  'json',
  'sample.json',
);
`;

// Fix head: replace old imports block
const headBody = head.replace(/^import[\s\S]*?^@Injectable/m, '').trimStart();
const headWithoutImports = `@Injectable\n${headBody.split('@Injectable')[1]}`;

// Fix retryResume to use ResumeGenerationService
const fixedHead = headWithoutImports.replace(
  /this\.generateResume\(/g,
  'this.resumeGenerationService.generateResume(',
);

const output = `${imports}

@Injectable
export class ResumesService {
${fixedHead.split('export class ResumesService {')[1]}

${middle}

${tailStart.replace(/VALID_TEMPLATES\.includes\(template as \(typeof VALID_TEMPLATES\)\[number\]\)/g, 'isValidTemplate(template)')}

${coverLetterMethods}

${tailEnd}`;

// Fix constructor to inject new services
const withConstructor = output.replace(
  'private readonly gateway: ResumesGateway\n  ) {}',
  `private readonly gateway: ResumesGateway,
    private readonly coverLetterPdfService: CoverLetterPdfService,
    private readonly resumeGenerationService: ResumeGenerationService,
  ) {}`,
);

fs.writeFileSync(
  'apps/backend/src/resumes/resumes.service.ts',
  withConstructor,
);
console.log('resumes.service.ts rebuilt');
