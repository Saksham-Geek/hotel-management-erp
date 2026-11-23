import { AsyncLocalStorage } from 'node:async_hooks';
import type { TelemetryDescriptor } from '@erp/shared';

export interface TelemetryRequestContext {
  desc: TelemetryDescriptor;
  startTime: number;
  dbTimeMs: number;
  dbQueryCount: number;
}

export const telemetryStorage = new AsyncLocalStorage<TelemetryRequestContext>();

export function getTelemetryContext(): TelemetryRequestContext | undefined {
  return telemetryStorage.getStore();
}

export function recordDbTiming(durationMs: number): void {
  const store = telemetryStorage.getStore();
  if (store) {
    store.dbTimeMs += durationMs;
    store.dbQueryCount += 1;
  }
}
