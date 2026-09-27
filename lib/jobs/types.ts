export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';

export interface JobInstance<T = Record<string, unknown>> {
  id: string;
  queue: string;
  name: string;
  data: T;
  attemptsMade: number;
  maxAttempts: number;
  status: JobStatus;
  error?: string;
  createdAt: string;
  processedAt?: string;
  finishedAt?: string;
}

export interface JobEnqueueOptions {
  delayMs?: number;
  priority?: number;
  retries?: number;
}

export interface JobQueueAdapter {
  name: 'memory' | 'redis_bullmq';
  isProduction: boolean;

  enqueue<T = Record<string, unknown>>(
    queueName: string,
    jobName: string,
    payload: T,
    options?: JobEnqueueOptions,
  ): Promise<string>;

  process<T = Record<string, unknown>>(
    queueName: string,
    handler: (job: JobInstance<T>) => Promise<unknown>,
  ): void;

  getJob(jobId: string): Promise<JobInstance | null>;

  healthCheck?(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

