import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { OpenRouterModelsService } from './openrouter-models.service';
import { OpenRouterModule } from '../openrouter/openrouter.module';

@Module({
  imports: [OpenRouterModule],
  controllers: [AiController],
  providers: [AiService, OpenRouterModelsService],
  exports: [AiService, OpenRouterModelsService],
})
export class AiModule {}
