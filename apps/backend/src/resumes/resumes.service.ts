import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
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
  DEFAULT_RESUME_PDF_SETTINGS,
  type ResumePdfSettings,
} from './templates';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { getResumePdfSettings } from '../ai/resume-settings';
import { formatAiProviderError } from '../ai/format-ai-error';
import { CoverLetterPdfService } from './cover-letter-pdf.service';
import { ResumeGenerationService } from './resume-generation.service';
import {
  isValidTemplate,
  MISSING_OPENROUTER_KEY_MESSAGE,
} from '@resume-builder/shared';

const SAMPLE_RESUME_JSON_PATH = join(
  process.cwd(),
  'assets',
  'json',
  'sample.json',
);

@Injectable()
export class ResumesService {
  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<Resume>,
    @InjectModel(User.name) private userModel: Model<User>,
    private aiService: AiService,
    private usersService: UsersService,
    private readonly gateway: ResumesGateway,
    private readonly coverLetterPdfService: CoverLetterPdfService,
    @Inject(forwardRef(() => ResumeGenerationService))
    private readonly resumeGenerationService: ResumeGenerationService,
  ) {}

  private getStoredResumeJson(resume: Resume): ResumeData {
    if (!resume.resumeJson || typeof resume.resumeJson !== 'object') {
      throw new NotFoundException('Resume JSON not found');
    }

    return resume.resumeJson as unknown as ResumeData;
  }

  async getResumeJson(
    id: string,
    userId: string,
  ): Promise<ResumeData> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();

    if (!resume) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    return this.getStoredResumeJson(resume);
  }

  async validateApiKeyForGeneration(userId: string): Promise<void> {
    const keys = await this.usersService.getApiKeysForUser(userId);

    if (!keys.openrouter?.trim()) {
      throw new BadRequestException(
        MISSING_OPENROUTER_KEY_MESSAGE,
      );
    }
  }

  async markResumeFailed(
    resumeId: string,
    userId: string,
    failureMessage?: string,
  ): Promise<void> {
    const message = failureMessage?.trim() || undefined;
    await this.resumeModel
      .updateOne(
        { _id: resumeId, userId },
        {
          status: 'failed',
          ...(message ? { failureMessage: message } : {}),
        },
      )
      .exec();
    this.gateway.emitFailed(resumeId, message);
  }

  async retryResume(
    resumeId: string,
    userId: string,
    userName: string,
    userTemplate?: string,
  ): Promise<void> {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId })
      .exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.status !== 'failed') {
      throw new BadRequestException('Only failed resumes can be retried');
    }

    if (resume.generationSource === 'manual') {
      throw new BadRequestException('Manual resumes cannot be retried');
    }

    await this.validateApiKeyForGeneration(userId);

    await this.resumeModel
      .updateOne(
        { _id: resumeId, userId },
        { status: 'in_progress', $unset: { failureMessage: '' } },
      )
      .exec();

    this.resumeGenerationService.generateResume(
      resumeId,
      userId,
      userName,
      userTemplate,
      'default',
    ).catch((error) => {
      const message = formatAiProviderError(error);
      console.error('Error retrying resume generation:', message);
      void this.markResumeFailed(resumeId, userId, message);
    });
  }

  async create(
    userId: string,
    userName: string,
    companyName: string,
    roleType: string,
    jobDescription: string,
    json: ResumeData,
    userTemplate?: string,
    conversationId?: string,
    status: string = 'completed',
    aiModel?: string,
    aiVersion?: string,
    generationSource: 'ai' | 'manual' = 'ai',
  ) {
    const pdfSettings = await this.getResumePdfSettingsForUser(userId);
    const pdfBuffer = await this.generatePDF(
      json,
      userTemplate || 'template1',
      pdfSettings,
    );

    const resume = new this.resumeModel({
      userId,
      companyName,
      roleType,
      jobDescription,
      resumeJson: json,
      conversationId: conversationId,
      status: status,
      aiModel,
      aiVersion,
      generationSource,
    });

    const savedResume = await resume.save();

    return { resume: savedResume, pdfBuffer, userName };
  }

  /**
   * Create a resume record with in_progress status (before generation starts)
   */
  async createInProgress(
    userId: string,
    companyName: string,
    roleType: string,
    jobDescription: string,
    aiModel?: string,
    aiVersion?: string,
  ) {
    const resume = new this.resumeModel({
      userId,
      companyName,
      roleType,
      jobDescription,
      status: 'in_progress',
      aiModel,
      aiVersion,
    });

    const savedResume = await resume.save();
    return savedResume;
  }

  /**
   * Update resume with generated data and mark as completed
   */
  async updateResumeWithGeneratedData(
    resumeId: string,
    userId: string,
    userName: string,
    json: ResumeData,
    userTemplate?: string,
    conversationId?: string,
    coverLetter?: string,
  ) {
    const pdfSettings = await this.getResumePdfSettingsForUser(userId);
    const pdfBuffer = await this.generatePDF(
      json,
      userTemplate || 'template1',
      pdfSettings,
    );

    // Prepare cover letter if provided
    let coverLetterText: string | undefined;

    if (coverLetter) {
      // Ensure it's a string and format newlines
      coverLetterText = coverLetter;
      if (typeof coverLetterText !== 'string') {
        coverLetterText = String(coverLetterText);
      }
      // Replace escaped newlines with actual newlines if they exist
      coverLetterText = coverLetterText.replace(/\\n/g, '\n');
    }

    // Update the resume record
    const updateData: any = {
      resumeJson: json,
      conversationId: conversationId,
      status: 'completed',
    };

    // Only update coverLetter if provided
    if (coverLetterText) {
      updateData.coverLetter = coverLetterText;
    }

    const resume = await this.resumeModel.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: updateData, $unset: { failureMessage: '' } },
      { new: true },
    ).exec();

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    return { resume, pdfBuffer, userName };
  }

  /**

  /**
   * Parse questions from text and answer them in a single AI call
   * Returns array of {question: string, answer: string} objects
   */
  async parseAndAnswerQuestions(
    questionsText: string,
    resumeJson: Record<string, any>,
    jobDescription: string,
    userId: string,
    aiModel?: string,
    aiVersion?: string,
  ): Promise<Array<{ question: string; answer: string }>> {
    // Get user to check for custom questions prompt
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Use user's custom prompt if available, otherwise use default
    const questionsPrompt = user.questionsPrompt || undefined;

    const apiKeys = await this.usersService.getApiKeysForUser(userId);

    // Call OpenRouter with optional custom prompt
    return await this.aiService.parseAndAnswerQuestions(
      questionsText,
      resumeJson,
      jobDescription,
      questionsPrompt,
      aiModel || 'anthropic',
      aiVersion || 'anthropic/claude-sonnet-4.6',
      apiKeys,
    );
  }

  /**
   * Update cover letter for a resume
   */
  async updateCoverLetter(
    resumeId: string,
    userId: string,
    coverLetter: string,
  ): Promise<void> {
    const resume = await this.resumeModel.findOne({ _id: resumeId, userId }).exec();
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    await this.resumeModel.updateOne(
      { _id: resumeId, userId },
      { $set: { coverLetter } },
    ).exec();
  }

  /**
   * Update answers for a resume
   */
  async updateAnswers(
    resumeId: string,
    userId: string,
    answers: Array<{ question: string; answer: string }>,
  ): Promise<void> {
    const resume = await this.resumeModel.findOne({ _id: resumeId, userId }).exec();
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    // Clean answers array to remove _id fields and ensure proper structure
    const cleanedAnswers = answers.map((qa) => ({
      question: String(qa.question),
      answer: String(qa.answer),
    }));

    await this.resumeModel.updateOne(
      { _id: resumeId, userId },
      { $set: { answers: cleanedAnswers } },
    ).exec();
  }

  extractEmail(str: string) {
    return str.match(/\[([^\]]+)\]\(mailto:[^)]+\)/)?.[1] ?? str;
  }

  async generateTemplatePreviewPdf(
    template: string,
    userId: string,
  ): Promise<{ pdfBuffer: Buffer; filename: string }> {
    if (!isValidTemplate(template)) {
      throw new BadRequestException('Invalid template');
    }

    if (!existsSync(SAMPLE_RESUME_JSON_PATH)) {
      throw new NotFoundException('Sample resume JSON not found');
    }

    let sampleJson: ResumeData;
    try {
      sampleJson = JSON.parse(
        readFileSync(SAMPLE_RESUME_JSON_PATH, 'utf-8'),
      ) as ResumeData;
    } catch {
      throw new BadRequestException('Failed to parse sample resume JSON');
    }

    const pdfBuffer = await this.generatePdfFromJson(
      sampleJson,
      template,
      userId,
    );
    
    const filename = `${template}_preview.pdf`;

    return { pdfBuffer, filename };
  }

  async generatePdfFromJson(
    json: ResumeData,
    userTemplate?: string,
    userId?: string,
  ): Promise<Buffer> {
    const resumeData: ResumeData = {
      ...json,
      skills: Array.isArray(json.skills) ? json.skills : [],
    };
    if (resumeData.cover_letter) {
      delete resumeData.cover_letter;
    }
    if (resumeData.contact?.email?.includes('](mailto:')) {
      resumeData.contact.email = this.extractEmail(resumeData.contact.email);
    }
    const pdfSettings = userId
      ? await this.getResumePdfSettingsForUser(userId)
      : DEFAULT_RESUME_PDF_SETTINGS;
    return this.generatePDF(
      resumeData,
      userTemplate || 'template1',
      pdfSettings,
    );
  }

  private async getResumePdfSettingsForUser(
    userId: string,
  ): Promise<ResumePdfSettings> {
    const resumeSettings = await this.usersService.getResumeSettings(userId);
    return getResumePdfSettings(resumeSettings);
  }

  private async generatePDF(
    data: ResumeData,
    templateName: string = 'template1',
    pdfSettings: ResumePdfSettings = DEFAULT_RESUME_PDF_SETTINGS,
  ): Promise<Buffer> {
    // Select template based on templateName
    // For now, only template1 is available, but this structure allows for easy expansion
    if (templateName === 'template1') {
      const template = new ResumePDFTemplate1(data, pdfSettings);
      return template.generate();
    } else if (templateName === 'template2') {
      const template = new ResumePDFTemplate2(data, pdfSettings);
      return template.generate();
    } else if (templateName === 'template3') {
      const template = new ResumePDFTemplate3(data, pdfSettings);
      return template.generate();
    } else if (templateName === 'template4') {
      const template = new ResumePDFTemplate4(data, pdfSettings);
      return template.generate();
    } else if (templateName === 'template5') {
      const template = new ResumePDFTemplate5(data, pdfSettings);
      return template.generate();
    } else if (templateName === 'template6') {
      const template = new ResumePDFTemplate6(data, pdfSettings);
      return template.generate();
    } else if (templateName === 'template7') {
      const template = new ResumePDFTemplate7(data, pdfSettings);
      return template.generate();
    }

    // Default to template1 if template not found
    const template = new ResumePDFTemplate1(data, pdfSettings);
    return template.generate();
  }

  async findAllByUserId(
    userId: string,
    filters?: {
      companyName?: string;
      roleType?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<Resume[]> {
    const query: any = { userId };

    // Apply filters if provided
    if (filters) {
      if (filters.companyName) {
        query.companyName = {
          $regex: filters.companyName,
          $options: 'i', // Case-insensitive search
        };
      }

      if (filters.roleType) {
        query.roleType = {
          $regex: filters.roleType,
          $options: 'i', // Case-insensitive search
        };
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }
    }

    return this.resumeModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string, userId: string): Promise<Resume | null> {
    return this.resumeModel.findOne({ _id: id, userId }).exec();
  }


  async generateCoverLetterForResume(
    id: string,
    userId: string,
  ): Promise<{ pdfBuffer: Buffer; userName: string }> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();

    if (!resume) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
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

      formattedCoverLetter = this.coverLetterPdfService.normalizeCoverLetterText(coverLetterText);
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
      throw new NotFoundException(`Resume with id ${id} not found`);
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

    let coverLetterText = this.coverLetterPdfService.normalizeCoverLetterText(resume.coverLetter);

    // Generate PDF from the stored cover letter text
    const pdfBuffer = await this.coverLetterPdfService.generatePdf(
      user.name,
      coverLetterText,
      resume.createdAt,
    );

    return pdfBuffer;
  }

  async downloadResumePDF(
    id: string,
    userId: string,
  ): Promise<Buffer> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();

    if (!resume) throw new NotFoundException(`Resume with id ${id} not found`);

    const user = await this.usersService.findById(String(userId));
    const jsonData = this.getStoredResumeJson(resume);

    return this.generatePdfFromJson(
      jsonData,
      user.template || 'template1',
      String(userId),
    );
  }

  async downloadResumeJSON(id: string, userId: string): Promise<string> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();

    if (!resume) throw new NotFoundException(`Resume with id ${id} not found`);

    const jsonData = this.getStoredResumeJson(resume);

    return JSON.stringify(jsonData, null, 2);
  }

  async delete(id: string, userId: string): Promise<void> {
    const resume = await this.resumeModel.findOne({ _id: id, userId }).exec();

    if (!resume) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    await this.resumeModel.findByIdAndDelete(id).exec();
  }

  async bulkDelete(
    ids: string[],
    userId: string,
  ): Promise<{ deleted: number; failed: string[] }> {
    const failed: string[] = [];
    let deleted = 0;

    const resumes = await this.resumeModel
      .find({ _id: { $in: ids }, userId })
      .exec();

    for (const resume of resumes) {
      try {
        await this.resumeModel.findByIdAndDelete(resume._id).exec();
        deleted++;
      } catch (error) {
        failed.push(resume._id.toString());
        console.error(`Failed to delete resume ${resume._id}:`, error);
      }
    }

    return { deleted, failed };
  }
}
