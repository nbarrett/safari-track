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
          options.onError?.(err instanceof Error ? err : new Error(String(err)));
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
