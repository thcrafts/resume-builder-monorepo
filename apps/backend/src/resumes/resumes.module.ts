import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResumesService } from './resumes.service';
import { ResumesController } from './resumes.controller';
import { ResumesGateway } from './resumes.gateway';
import { Resume, ResumeSchema } from './schemas/resume.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { AiModule } from '../ai/ai.module';
import { PromptRegistryService } from './prompt-registry.service';
import { ResumeGenerationService } from './resume-generation.service';
import { CoverLetterPdfService } from './cover-letter-pdf.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    AiModule,
  ],
  providers: [
    ResumesService,
    ResumesGateway,
    PromptRegistryService,
    CoverLetterPdfService,
    ResumeGenerationService,
  ],
  controllers: [ResumesController],
})
export class ResumesModule {}
