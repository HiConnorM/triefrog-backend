import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@triefrog/db';
import { encrypt, decrypt } from '@triefrog/shared-utils';
import axios from 'axios';

@Injectable()
export class RepoConnectionService {
  private readonly prisma = new PrismaClient();
  private readonly encryptionKey: string;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY!;
    if (!this.encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
  }

  async createConnection(
    projectId: string,
    token: string,
    provider: string,
  ): Promise<{ id: string; projectId: string; provider: string; createdAt: Date }> {
    const encryptedToken = encrypt(token, this.encryptionKey);

    const existing = await this.prisma.repoConnection.findFirst({
      where: { projectId },
    });

    const connection = await this.prisma.repoConnection.upsert({
      where: { id: existing?.id ?? '' },
      create: {
        projectId,
        encryptedToken,
        provider,
      },
      update: {
        encryptedToken,
        provider,
      },
    });

    return {
      id: connection.id,
      projectId: connection.projectId,
      provider: connection.provider,
      createdAt: connection.createdAt,
    };
  }

  async getConnection(
    projectId: string,
  ): Promise<{ id: string; projectId: string; provider: string; createdAt: Date; updatedAt: Date }> {
    const connection = await this.prisma.repoConnection.findFirst({
      where: { projectId },
    });

    if (!connection) {
      throw new NotFoundException(
        `No connection found for project ${projectId}`,
      );
    }

    return {
      id: connection.id,
      projectId: connection.projectId,
      provider: connection.provider,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  async deleteConnection(projectId: string): Promise<void> {
    const connection = await this.prisma.repoConnection.findFirst({
      where: { projectId },
    });

    if (!connection) {
      throw new NotFoundException(
        `No connection found for project ${projectId}`,
      );
    }

    await this.prisma.repoConnection.delete({ where: { id: connection.id } });
  }

  async verifyConnection(
    projectId: string,
  ): Promise<{ valid: boolean; login: string | null; error?: string }> {
    const token = await this.getDecryptedToken(projectId);

    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      return {
        valid: true,
        login: response.data.login as string,
      };
    } catch (err: any) {
      const status = err?.response?.status;
      return {
        valid: false,
        login: null,
        error:
          status === 401
            ? 'Token is invalid or expired'
            : `GitHub API error: ${status ?? err.message}`,
      };
    }
  }

  async getDecryptedToken(projectId: string): Promise<string> {
    const connection = await this.prisma.repoConnection.findFirst({
      where: { projectId },
    });

    if (!connection) {
      throw new NotFoundException(
        `No connection found for project ${projectId}`,
      );
    }

    try {
      return decrypt(connection.encryptedToken, this.encryptionKey);
    } catch {
      throw new BadRequestException('Failed to decrypt stored token');
    }
  }
}
