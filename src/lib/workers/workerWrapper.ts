import type { WorkerTaskRequest, WorkerTaskErrorResponse, WorkerTaskSuccessResponse } from './protocol';

/**
 * Wraps a worker task execution handler in a try/catch safety bound to isolate errors
 * and prevent unhandled exceptions from crashing the worker or main thread.
 */
export function wrapWorkerHandler<T, R>(
  handler: (payload: T) => Promise<R> | R
): (event: MessageEvent<WorkerTaskRequest<T>>) => Promise<void> {
  return async (event: MessageEvent<WorkerTaskRequest<T>>) => {
    let taskId = 'unknown';

    try {
      if (!event || !event.data) {
        throw new Error('Invalid worker message format: missing message data');
      }

      taskId = event.data.taskId || 'unknown';
      const payload = event.data.payload;

      const result = await handler(payload);
      const successResponse: WorkerTaskSuccessResponse<R> = {
        taskId,
        status: 'SUCCESS',
        result,
      };
      self.postMessage(successResponse);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;

      const errorResponse: WorkerTaskErrorResponse = {
        taskId,
        status: 'ERROR',
        error: {
          message: errorMsg,
          stack,
        },
      };
      self.postMessage(errorResponse);
    }
  };
}
