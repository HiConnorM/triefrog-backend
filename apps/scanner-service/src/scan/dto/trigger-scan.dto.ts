import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class TriggerScanDto {
  @ApiProperty({ description: 'The ID of the project to scan' })
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiPropertyOptional({ description: 'Who triggered this scan (user ID or system)' })
  @IsString()
  @IsOptional()
  triggeredBy?: string;
}
