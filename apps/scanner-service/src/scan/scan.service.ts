import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { db } from '@triefrog/db';
import { v4 as uuidv4 } from 'uuid';
import type { ScanRequestedEvent } from '@triefrog/shared-types';

@Injectable()
export class ScanService {
  constructor(
    @InjectQueue('scan') private readonly scanQueue: Queue<ScanRequestedEvent>,
  ) {}

  async triggerScan(projectId: string, triggeredBy?: string) {
    const scanId = uuidv4();

    // Create scan record in DB
    const scan = await db.scan.create({
      data: {
        id: scanId,
        projectId,
        status: 'queued',
        triggeredBy: triggeredBy ?? 'system',
        startedAt: new Date(),
      },
    });

    // Enqueue the job
    await this.scanQueue.add(
      'scan-requested',
      {
        scanId: scan.id,
        projectId,
        triggeredBy: triggeredBy ?? 'system',
      },
      {
        jobId: `scan:${scan.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    return scan;
  }

  async getScan(id: string) {
    const scan = await db.scan.findUnique({ where: { id } });
    if (!scan) {
      throw new NotFoundException(`Scan ${id} not found`);
    }
    return scan;
  }

  async getProjectScans(projectId: string) {
    return db.scan.findMany({
      where: { projectId },
      orderBy: { startedAt: 'desc' },
    });
  }
}
