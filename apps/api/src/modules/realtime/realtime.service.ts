import { Injectable, Inject, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.provider';

export interface ScanProgressEvent {
  type: string;
  projectId: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly subscribers = new Map<string, Redis>();

  constructor(@Inject(REDIS_CLIENT) private readonly redisPublisher: Redis) {}

  /**
   * Subscribe to scan progress events for a given projectId.
   * Returns an unsubscribe function.
   */
  subscribe(
    projectId: string,
    onEvent: (data: string) => void,
    onDone: () => void,
  ): () => void {
    const channel = `scan:progress:${projectId}`;

    // Each subscription gets its own dedicated Redis connection
    const subscriber = this.redisPublisher.duplicate();

    const subscriptionKey = `${projectId}:${Date.now()}:${Math.random()}`;
    this.subscribers.set(subscriptionKey, subscriber);

    subscriber.subscribe(channel, (err) => {
      if (err) {
        console.error(`Failed to subscribe to channel ${channel}:`, err);
        onDone();
      }
    });

    subscriber.on('message', (_channel: string, message: string) => {
      onEvent(message);
    });

    subscriber.on('error', (err) => {
      console.error('Redis subscriber error:', err);
    });

    const unsubscribe = () => {
      subscriber.unsubscribe(channel).catch(console.error);
      subscriber.quit().catch(console.error);
      this.subscribers.delete(subscriptionKey);
      onDone();
    };

    return unsubscribe;
  }

  /**
   * Publish a scan progress event to the Redis channel for a project.
   */
  async publish(projectId: string, event: ScanProgressEvent): Promise<void> {
    const channel = `scan:progress:${projectId}`;
    const payload = JSON.stringify({
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    });

    await this.redisPublisher.publish(channel, payload);
  }

  onModuleDestroy() {
    for (const [key, subscriber] of this.subscribers.entries()) {
      subscriber.quit().catch(console.error);
      this.subscribers.delete(key);
    }
  }
}
