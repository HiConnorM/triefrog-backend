import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiParam } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { RealtimeService } from './realtime.service';
import { Public } from '../../common/decorators/public.decorator';

const HEARTBEAT_INTERVAL_MS = 15_000;

@ApiTags('realtime')
@Controller('projects')
export class RealtimeController {
  constructor(private readonly realtimeService: RealtimeService) {}

  // Public: browser EventSource cannot attach an Authorization header.
  // Access is scoped by opaque projectId; tighten with a signed query token later.
  @Public()
  @Get(':projectId/scan/stream')
  @ApiOperation({
    summary: 'SSE stream for scan progress of a project',
    description:
      'Opens a Server-Sent Events stream. Messages are forwarded from Redis pub/sub channel scan:progress:{projectId}. A heartbeat is sent every 15 seconds.',
  })
  @ApiParam({ name: 'projectId', type: String })
  async stream(
    @Param('projectId') projectId: string,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const raw = reply.raw;

    raw.setHeader('Content-Type', 'text/event-stream');
    raw.setHeader('Cache-Control', 'no-cache');
    raw.setHeader('Connection', 'keep-alive');
    raw.setHeader('Access-Control-Allow-Origin', '*');
    raw.setHeader('X-Accel-Buffering', 'no');
    raw.flushHeaders?.();

    const send = (data: string) => {
      if (!raw.destroyed) {
        raw.write(`data: ${data}\n\n`);
      }
    };

    let unsubscribe: (() => void) | null = null;
    let heartbeat: NodeJS.Timeout | null = null;
    let closed = false;

    const cleanup = () => {
      if (closed) return;
      closed = true;

      if (heartbeat) {
        clearInterval(heartbeat);
        heartbeat = null;
      }

      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (!raw.destroyed) {
        raw.end();
      }
    };

    unsubscribe = this.realtimeService.subscribe(
      projectId,
      (data: string) => send(data),
      () => cleanup(),
    );

    heartbeat = setInterval(() => {
      send(JSON.stringify({ type: 'heartbeat' }));
    }, HEARTBEAT_INTERVAL_MS);

    raw.on('close', cleanup);
    raw.on('error', cleanup);
  }
}
