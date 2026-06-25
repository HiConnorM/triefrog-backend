import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { prisma } from '@triefrog/db';
import { createLogger } from '@triefrog/shared-utils';
import { RegisterDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

const logger = createLogger('auth-service');

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    orgId: string;
    role: string;
  };
  tokens: TokenPair;
}

/** Build a URL-safe, unique-ish org slug from a display name. */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || 'org'}-${suffix}`;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  // ------------------------------------------------------------------ register
  async register(dto: RegisterDto): Promise<AuthResult> {
    const existing = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Wrap org + user + orgMember creation in a transaction
    const { org, user, orgMember } = await prisma.$transaction(async (tx) => {
      const orgName = dto.orgName ?? `${dto.name}'s Org`;
      const org = await tx.org.create({
        data: {
          name: orgName,
          slug: slugify(orgName),
        },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          name: dto.name,
        },
      });

      const orgMember = await tx.orgMember.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: 'owner',
        },
      });

      return { org, user, orgMember };
    });

    logger.info({ userId: user.id, orgId: org.id }, 'User registered');

    const tokens = await this.generateTokens(user.id, org.id, orgMember.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: org.id,
        role: orgMember.role,
      },
      tokens,
    };
  }

  // --------------------------------------------------------------------- login
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const orgMember = await prisma.orgMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });

    if (!orgMember) {
      throw new NotFoundException('No organisation found for this user');
    }

    const tokens = await this.generateTokens(
      user.id,
      orgMember.orgId,
      orgMember.role,
    );

    logger.info({ userId: user.id, orgId: orgMember.orgId }, 'User logged in');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: orgMember.orgId,
        role: orgMember.role,
      },
      tokens,
    };
  }

  // ------------------------------------------------------------------- refresh
  async refresh(token: string): Promise<TokenPair> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token },
    });

    if (!stored || stored.expiresAt < new Date()) {
      // Clean up expired token if found
      if (stored) {
        await prisma.refreshToken.delete({ where: { token } }).catch(() => {});
      }
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const orgMember = await prisma.orgMember.findFirst({
      where: { userId: stored.userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!orgMember) {
      throw new NotFoundException('No organisation found for this user');
    }

    // Rotate the refresh token
    await prisma.refreshToken.delete({ where: { token } });

    const tokens = await this.generateTokens(
      stored.userId,
      orgMember.orgId,
      orgMember.role,
    );

    logger.info({ userId: stored.userId }, 'Tokens refreshed');

    return tokens;
  }

  // -------------------------------------------------------------------- logout
  async logout(userId: string, refreshToken: string): Promise<void> {
    await prisma.refreshToken
      .deleteMany({ where: { token: refreshToken, userId } })
      .catch(() => {});

    logger.info({ userId }, 'User logged out');
  }

  // ------------------------------------------------------------ validateUser --
  async validateUser(
    email: string,
    password: string,
  ): Promise<{
    id: string;
    email: string;
    name: string;
  } | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }

  // --------------------------------------------------------- generateTokens --
  async generateTokens(
    userId: string,
    orgId: string,
    role: string,
  ): Promise<TokenPair> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const payload: JwtPayload = {
      sub: userId,
      orgId,
      role,
      email: user?.email ?? '',
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    // Generate a cryptographically random refresh token
    const refreshTokenValue = Buffer.from(
      crypto.getRandomValues(new Uint8Array(48)),
    ).toString('hex');

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
