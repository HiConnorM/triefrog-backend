import { ApiProperty } from '@nestjs/swagger';

export class UpdateNodeStatusDto {
  @ApiProperty({
    description: 'New status for the node',
    example: 'verified',
  })
  status: string;
}
