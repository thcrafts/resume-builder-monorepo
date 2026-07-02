import { Controller, Get } from '@nestjs/common';
import { OpenRouterModelsService } from './openrouter-models.service';

@Controller('ai')
export class AiController {
  constructor(private readonly openRouterModelsService: OpenRouterModelsService) {}

  @Get('models')
  async getModels() {
    return this.openRouterModelsService.getCatalog();
  }
}
