import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class FindingsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category (e.g. setup, docs, security, data, deploy)' })
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by severity (critical, warn)' })
  severity?: string;

  @ApiPropertyOptional({ description: 'Filter by resolved status' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  resolved?: boolean;
}
