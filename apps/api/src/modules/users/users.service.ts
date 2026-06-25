import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@triefrog/db';
import { createLogger } from '@triefrog/shared-utils';

const logger = createLogger('auth-service');

export interface UpdateProfileDto {
  name?: string;
}

@Injectable()
export class UsersService {
  async findById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        updatedAt: true,
      },
    });

    logger.info({ userId: id }, 'User profile updated');

    return user;
  }
}
