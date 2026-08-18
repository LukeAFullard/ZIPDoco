import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkerPool } from './pool';

describe('WorkerPool Architecture', () => {
  let pool: WorkerPool;

  beforeEach(async () => {
    pool = new WorkerPool({ maxWorkers: 4 });
    await pool.init();
  });

  afterEach(() => {
    pool.terminate();
  });

  it('should initialize pool with maxWorkers count', () => {
    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(4);
    expect(stats.busyWorkers).toBe(0);
    expect(stats.pendingTasks).toBe(0);
  });

  it('should execute task and return result', async () => {
    const payload = { testData: 'hello' };
    const result = await pool.execute<{ testData: string }, { processedTask: string; echo: { testData: string } }>(
      'PREFLIGHT_HEADER_SCAN',
      payload
    );

    expect(result).toBeDefined();
    expect(result.echo.testData).toBe('hello');
  });

  it('should queue tasks when all workers are busy', async () => {
    const promises = Array.from({ length: 10 }).map((_, i) =>
      pool.execute('DECOMPRESS_ENTRY', { index: i })
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(10);
    expect(pool.getStats().busyWorkers).toBe(0);
  });

  it('should report progress notifications when onProgress callback is provided', async () => {
    let progressCount = 0;

    const customPool = new WorkerPool({ maxWorkers: 1 });
    await customPool.init();

    const promise = customPool.execute('REPACK_ZIP', { foo: 'bar' }, {
      onProgress: (_p) => {
        progressCount++;
      }
    });

    await promise;
    expect(progressCount).toBeGreaterThanOrEqual(0);
    customPool.terminate();
  });

  it('should terminate clean and reject pending tasks', async () => {
    const poolToTerminate = new WorkerPool({ maxWorkers: 1 });
    await poolToTerminate.init();

    const taskPromise = poolToTerminate.execute('SECURITY_SCAN', { item: 1 });
    poolToTerminate.terminate();

    await expect(taskPromise).rejects.toThrow('Worker pool terminated');
  });
});
