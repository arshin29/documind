import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { SearchService } from './search.service';
import { SemanticSearchDto } from './dto/semantic-search.dto';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * POST /api/search/semantic
   * Semantic vector search across accessible document chunks within workspace
   */
  @Post('semantic')
  @HttpCode(HttpStatus.OK)
  async searchSemantic(
    @CurrentUser() user: SafeUser,
    @Body() dto: SemanticSearchDto,
  ) {
    return this.searchService.searchSemantic(user, dto);
  }
}

