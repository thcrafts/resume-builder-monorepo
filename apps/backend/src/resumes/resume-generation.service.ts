import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Resume } from './schemas/resume.schema';
import { User } from '../users/schemas/user.schema';
import { AiService } from '../ai/ai.service';
import { UsersService } from '../users/users.service';
import { ResumesGateway } from './resumes.gateway';
import { PromptRegistryService } from './prompt-registry.service';
import { ResumesService } from './resumes.service';
import { formatAiProviderError } from '../ai/format-ai-error';
import { DEFAULT_AI_MODEL, DEFAULT_AI_VERSION } from '@resume-builder/shared';

@Injectable()
export class ResumeGenerationService {
  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<Resume>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly aiService: AiService,
    private readonly usersService: UsersService,
    private readonly gateway: ResumesGateway,
    private readonly promptRegistry: PromptRegistryService,
    @Inject(forwardRef(() => ResumesService))
    private readonly resumesService: ResumesService,
  ) {}

  async generateResume(
    resumeId: string,
    userId: string,
    userName: string,
    userTemplate?: string,
    industry?: string,
  ) {
    const resume = await this.resumeModel
      .findOne({ _id: resumeId, userId })
      .exec();
    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    let instructions: string;

    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      instructions = this.promptRegistry.resolveInstructions(
        industry,
        user.instructions,
      );
    } catch (error) {
      const message = formatAiProviderError(error);
      await this.resumesService.markResumeFailed(resumeId, userId, message);
      throw error;
    }

    const apiKeys = await this.usersService.getApiKeysForUser(userId);
    const resumeSettings = await this.usersService.getResumeSettings(userId);
    const { resumeJson, threadId } = await this.aiService.generateResume(
      resume.jobDescription,
      instructions,
      resume.aiModel || DEFAULT_AI_MODEL,
      resume.aiVersion || DEFAULT_AI_VERSION,
      apiKeys,
      resumeSettings,
    );

    if (resumeJson.cover_letter) {
      delete resumeJson.cover_letter;
    }

    const { resume: updatedResume, pdfBuffer, userName: savedUserName } =
      await this.resumesService.updateResumeWithGeneratedData(
        resumeId,
        userId,
        userName,
        resumeJson,
        userTemplate,
        threadId,
      );

    console.log(
      `\n=====================================================================================\nGenerated successfully at ${new Date()}: \nName: ${userName}, Company: ${resume.companyName}, Title: ${resumeJson.title}`,
    );

    this.gateway.emitDone(resumeId);

    return {
      resume: updatedResume,
      pdfBuffer,
      userName: savedUserName,
    };
  }
}
