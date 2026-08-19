import { describe, it, expect, vi } from 'vitest';
import { wrapWorkerHandler } from './workerWrapper';
import type { WorkerTaskRequest } from './protocol';

describe('wrapWorkerHandler Isolation', () => {
  it('should catch task exceptions and emit structured WorkerTaskErrorResponse', async () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal('self', { postMessage: mockPostMessage });

    const throwingHandler = () => {
      throw new Error('Simulated processing crash inside worker');
    };

    const wrapped = wrapWorkerHandler(throwingHandler);

    const fakeEvent = {
      data: {
        taskId: 'task_err_1',
        type: 'DECOMPRESS_ENTRY',
        payload: { file: 'bad.bin' },
      } as WorkerTaskRequest,
    } as MessageEvent;

    await wrapped(fakeEvent);

    expect(mockPostMessage).toHaveBeenCalledWith({
      taskId: 'task_err_1',
      status: 'ERROR',
      error: expect.objectContaining({
        message: 'Simulated processing crash inside worker',
      }),
    });

    vi.unstubAllGlobals();
  });

  it('should post success response when handler succeeds', async () => {
    const mockPostMessage = vi.fn();
    vi.stubGlobal('self', { postMessage: mockPostMessage });

    const successHandler = (payload: { x: number }) => ({ result: payload.x * 2 });

    const wrapped = wrapWorkerHandler(successHandler);

    const fakeEvent = {
      data: {
        taskId: 'task_ok_1',
        type: 'PREFLIGHT_HEADER_SCAN',
        payload: { x: 21 },
      } as WorkerTaskRequest,
    } as MessageEvent;

    await wrapped(fakeEvent);

    expect(mockPostMessage).toHaveBeenCalledWith({
      taskId: 'task_ok_1',
      status: 'SUCCESS',
      result: { result: 42 },
    });

    vi.unstubAllGlobals();
  });
});
