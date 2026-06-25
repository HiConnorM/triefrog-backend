import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsUrl()
  repoUrl: string;

  @ApiProperty()
  @IsString()
  orgId: string;
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsUrl()
  @IsOptional()
  repoUrl?: string;
}

export class ProjectDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  repoUrl: string;

  @ApiProperty()
  orgId: string;

  @ApiPropertyOptional()
  lastScanStatus?: string;

  @ApiPropertyOptional()
  lastScanAt?: Date;

  @ApiPropertyOptional()
  repoConnection?: {
    id: string;
    provider: string;
    createdAt: Date;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
