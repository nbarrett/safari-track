"use client";

import { useState, useCallback } from "react";
import { enqueue } from "~/lib/offline-queue";

interface OfflineMutationOptions<TInput, TResult> {
  mutationFn: (input: TInput) => Promise<TResult>;
  path: string;
  onSuccess?: (result: TResult | null, input: TInput) => void;
  onError?: (error: Error) => void;
  onOfflineQueued?: (input: TInput) => void;
}

interface OfflineMutationResult<TInput> {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<void>;
  isPending: boolean;
  isOfflineQueued: boolean;
}

const NON_RETRYABLE_CODES = new Set([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "PARSE_ERROR",
  "UNPROCESSABLE_CONTENT",
]);

function isTransientError(err: unknown): boolean {
  if (!navigator.onLine) return true;

  const shape = (err as { shape?: { data?: { code?: string } } })?.shape;
  if (shape?.data?.code && NON_RETRYABLE_CODES.has(shape.data.code)) return false;

  if (err instanceof TypeError) return true;

  const cause = (err as { cause?: unknown })?.cause;
  if (cause instanceof TypeError) return true;

  if (!shape) return true;

  return false;
}

export function useOfflineMutation<TInput, TResult = unknown>(
  options: OfflineMutationOptions<TInput, TResult>,
): OfflineMutationResult<TInput> {
  const [isPending, setIsPending] = useState(false);
  const [isOfflineQueued, setIsOfflineQueued] = useState(false);

  const execute = useCallback(
    async (input: TInput) => {
      if (navigator.onLine) {
        setIsPending(true);
        try {
          const result = await options.mutationFn(input);
          options.onSuccess?.(result, input);
        } catch (err) {
          if (isTransientError(err)) {
            await enqueue(options.path, input);
            setIsOfflineQueued(true);
            options.onOfflineQueued?.(input);
            options.onSuccess?.(null, input);
            setTimeout(() => setIsOfflineQueued(false), 2000);
          } else {
            options.onError?.(err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          setIsPending(false);
        }
        return;
      }

      await enqueue(options.path, input);
      setIsOfflineQueued(true);
      options.onOfflineQueued?.(input);
      options.onSuccess?.(null, input);
      setTimeout(() => setIsOfflineQueued(false), 2000);
    },
    [options],
  );

  const mutate = useCallback(
    (input: TInput) => {
      void execute(input);
    },
    [execute],
  );

  return { mutate, mutateAsync: execute, isPending, isOfflineQueued };
}
