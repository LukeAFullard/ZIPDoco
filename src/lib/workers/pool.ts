import type {
  WorkerTaskRequest,
  WorkerMessageToMain,
  WorkerPoolConfig,
  WorkerTaskOptions,
} from './protocol';

interface PendingTask<T = unknown, R = unknown> {
  taskId: string;
  request: WorkerTaskRequest<T>;
  options?: WorkerTaskOptions;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

interface ManagedWorker {
  id: number;
  worker: Worker | MockWorkerInstance;
  busy: boolean;
  currentTaskId: string | null;
}

// For Node / Vitest environments without standard Web Workers
export class MockWorkerInstance {
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((ev: ErrorEvent) => void) | null = null;
  public terminated = false;

  postMessage(message: unknown, _transfer?: Transferable[]) {
    if (this.terminated) return;
    const req = message as WorkerTaskRequest;
    setTimeout(() => {
      if (this.terminated) return;
      if (this.onmessage) {
        this.onmessage({
          data: {
            taskId: req.taskId,
            status: 'SUCCESS',
            result: { processedTask: req.taskId, echo: req.payload },
          },
        } as MessageEvent);
      }
    }, 0);
  }

  terminate() {
    this.terminated = true;
  }
}

export class WorkerPool {
  private workers: ManagedWorker[] = [];
  private pendingQueue: PendingTask<unknown, unknown>[] = [];
  private taskMap = new Map<string, PendingTask<unknown, unknown>>();
  private workerScriptUrl?: string;
  public readonly maxWorkers: number;
  private workerIdCounter = 0;

  constructor(config: WorkerPoolConfig = {}) {
    const hardwareConcurrency = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
      ? navigator.hardwareConcurrency
      : 4;

    // Clamp worker pool size between 2 and 8
    this.maxWorkers = config.maxWorkers ?? Math.min(Math.max(hardwareConcurrency, 2), 8);
    this.workerScriptUrl = config.workerScriptUrl;
  }

  /**
   * Initializes the pool with workers up to maxWorkers.
   */
  public async init(): Promise<void> {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker();
    }
  }

  private createWorker(): ManagedWorker {
    const workerId = ++this.workerIdCounter;
    let workerInstance: Worker | MockWorkerInstance;

    if (typeof Worker !== 'undefined' && this.workerScriptUrl) {
      try {
        workerInstance = new Worker(this.workerScriptUrl, { type: 'module' });
      } catch {
        workerInstance = new MockWorkerInstance();
      }
    } else {
      workerInstance = new MockWorkerInstance();
    }

    const managedWorker: ManagedWorker = {
      id: workerId,
      worker: workerInstance,
      busy: false,
      currentTaskId: null,
    };

    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as WorkerMessageToMain;
      if (!msg || !msg.taskId) return;

      const pending = this.taskMap.get(msg.taskId);
      if (!pending) return;

      if (msg.status === 'PROGRESS') {
        pending.options?.onProgress?.(msg.progress);
        return;
      }

      this.taskMap.delete(msg.taskId);
      managedWorker.busy = false;
      managedWorker.currentTaskId = null;

      if (msg.status === 'SUCCESS') {
        pending.resolve(msg.result);
      } else if (msg.status === 'ERROR') {
        pending.reject(new Error(msg.error.message || 'Worker task execution failed'));
      }

      this.dispatchNext();
    };

    const handleError = (errorEvent: ErrorEvent) => {
      const currentTaskId = managedWorker.currentTaskId;
      if (currentTaskId) {
        const pending = this.taskMap.get(currentTaskId);
        if (pending) {
          this.taskMap.delete(currentTaskId);
          pending.reject(new Error(`Worker error: ${errorEvent.message || 'Unknown worker crash'}`));
        }
      }

      // Recycle crashed worker
      this.recycleWorker(managedWorker);
      this.dispatchNext();
    };

    if ('addEventListener' in workerInstance) {
      workerInstance.addEventListener('message', handleMessage as EventListener);
      workerInstance.addEventListener('error', handleError as EventListener);
    } else {
      workerInstance.onmessage = handleMessage;
      workerInstance.onerror = handleError;
    }

    this.workers.push(managedWorker);
    return managedWorker;
  }

  private recycleWorker(managedWorker: ManagedWorker): void {
    try {
      managedWorker.worker.terminate();
    } catch {
      // Ignore termination errors
    }

    const idx = this.workers.findIndex((w) => w.id === managedWorker.id);
    if (idx !== -1) {
      this.workers.splice(idx, 1);
    }

    // Re-create replacement worker
    this.createWorker();
  }

  /**
   * Dispatches task to available worker or queues it.
   */
  public execute<T = unknown, R = unknown>(
    type: WorkerTaskRequest['type'],
    payload: T,
    options?: WorkerTaskOptions
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const request: WorkerTaskRequest<T> = {
        taskId,
        type,
        payload,
        transferables: options?.transferables,
      };

      const pending: PendingTask<T, R> = {
        taskId,
        request,
        options,
        resolve,
        reject,
      };

      this.taskMap.set(taskId, pending as PendingTask<unknown, unknown>);
      this.pendingQueue.push(pending as PendingTask<unknown, unknown>);

      this.dispatchNext();
    });
  }

  private dispatchNext(): void {
    if (this.pendingQueue.length === 0) return;

    const availableWorker = this.workers.find((w) => !w.busy);
    if (!availableWorker) return;

    const task = this.pendingQueue.shift();
    if (!task) return;

    availableWorker.busy = true;
    availableWorker.currentTaskId = task.taskId;

    try {
      if (task.request.transferables && task.request.transferables.length > 0) {
        availableWorker.worker.postMessage(task.request, task.request.transferables);
      } else {
        availableWorker.worker.postMessage(task.request, []);
      }
    } catch (err) {
      availableWorker.busy = false;
      availableWorker.currentTaskId = null;
      this.taskMap.delete(task.taskId);
      task.reject(err instanceof Error ? err : new Error(String(err)));
      this.dispatchNext();
    }
  }

  /**
   * Gets pool stats: active workers, pending jobs, total workers.
   */
  public getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter((w) => w.busy).length,
      pendingTasks: this.pendingQueue.length,
    };
  }

  /**
   * Terminates all active workers and rejects any pending tasks.
   */
  public terminate(): void {
    for (const pending of this.pendingQueue) {
      pending.reject(new Error('Worker pool terminated'));
    }
    this.pendingQueue = [];

    for (const pending of this.taskMap.values()) {
      pending.reject(new Error('Worker pool terminated'));
    }
    this.taskMap.clear();

    for (const worker of this.workers) {
      try {
        worker.worker.terminate();
      } catch {
        // Ignore
      }
    }
    this.workers = [];
  }
}
