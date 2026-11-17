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
import { UsersService } from '../users/users.service';
import { ResumesGateway } from './resumes.gateway';
import { ResumesService } from './resumes.service';
import { formatAiProviderError } from '../ai/format-ai-error';
import { DEFAULT_SUMMARY_MODEL } from '@resume-builder/shared';
import { ChunkedResumeBuilder } from './chunked-resume.builder';

@Injectable()
export class ResumeGenerationService {
  constructor(
    @InjectModel(Resume.name) private resumeModel: Model<Resume>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly usersService: UsersService,
    private readonly gateway: ResumesGateway,
    private readonly chunkedBuilder: ChunkedResumeBuilder,
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

    try {
      const user = await this.userModel.findById(userId).exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const apiKeys = await this.usersService.getApiKeysForUser(userId);
      const resumeSettings = await this.usersService.getResumeSettings(userId);

      const { resumeJson, threadId, generationMeta } =
        await this.chunkedBuilder.run({
          resumeId,
          jobDescription: resume.jobDescription,
          roleType: resume.roleType,
          industry,
          apiKeys,
          resumeSettings,
          user: {
            name: user.name,
            contacts: user.contacts ?? [],
            candidateProfile: user.candidateProfile ?? {
              professionalTitle: '',
              education: [],
              certifications: [],
              baselineSkills: [],
            },
            companies: user.companies ?? [],
            instructions: user.instructions,
            experiencePrompt: user.experiencePrompt,
          },
        });

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
          DEFAULT_SUMMARY_MODEL,
          DEFAULT_SUMMARY_MODEL,
          generationMeta,
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
    } catch (error) {
      const message = formatAiProviderError(error);
      await this.resumesService.markResumeFailed(resumeId, userId, message);
      throw error;
    }
  }
}
