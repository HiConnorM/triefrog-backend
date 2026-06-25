import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@triefrog/db';
import { createLogger } from '@triefrog/shared-utils';

const logger = createLogger('auth-service');

@Injectable()
export class OrgsService {
  async createOrg(name: string) {
    const slug = `${
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'org'
    }-${Math.random().toString(36).slice(2, 8)}`;
    const org = await prisma.org.create({ data: { name, slug } });
    logger.info({ orgId: org.id }, 'Org created');
    return org;
  }

  async findById(id: string) {
    const org = await prisma.org.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation ${id} not found`);
    }

    return org;
  }

  async addMember(orgId: string, userId: string, role = 'member') {
    const member = await prisma.orgMember.create({
      data: { orgId, userId, role },
    });
    logger.info({ orgId, userId, role }, 'Member added to org');
    return member;
  }

  async getMembers(orgId: string) {
    // Verify org exists first
    await this.findById(orgId);

    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.createdAt,
      user: m.user,
    }));
  }
}
