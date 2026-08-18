/**
 * Protocol and message type definitions for Web Worker Pool communications.
 */

export type TaskType = 'PREFLIGHT_HEADER_SCAN' | 'DECOMPRESS_ENTRY' | 'REPACK_ZIP' | 'SECURITY_SCAN';

export interface WorkerTaskRequest<T = unknown> {
  taskId: string;
  type: TaskType;
  payload: T;
  transferables?: Transferable[];
}

export interface WorkerTaskSuccessResponse<R = unknown> {
  taskId: string;
  status: 'SUCCESS';
  result: R;
  transferables?: Transferable[];
}

export interface WorkerTaskErrorResponse {
  taskId: string;
  status: 'ERROR';
  error: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export interface WorkerProgressNotification {
  taskId: string;
  status: 'PROGRESS';
  progress: {
    loaded: number;
    total: number;
    stage?: string;
  };
}

export type WorkerMessageToMain = WorkerTaskSuccessResponse | WorkerTaskErrorResponse | WorkerProgressNotification;

export interface WorkerPoolConfig {
  maxWorkers?: number;
  workerScriptUrl?: string;
}

export interface WorkerTaskOptions {
  transferables?: Transferable[];
  onProgress?: (progress: { loaded: number; total: number; stage?: string }) => void;
}
