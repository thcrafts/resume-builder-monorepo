import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OpenRouterModelsService } from './openrouter-models.service';

@Controller('ai')
export class AiController {
  constructor(private readonly openRouterModelsService: OpenRouterModelsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('models')
  async getModels() {
    return this.openRouterModelsService.getCatalog();
  }
}
