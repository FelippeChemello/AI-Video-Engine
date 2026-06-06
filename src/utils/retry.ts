import { sleep } from './sleep';

type RetryOptions = {
    attempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    timeoutMs?: number;
    label: string;
};

export async function retry<T>(
    operation: (attempt: number) => Promise<T>,
    {
        attempts = 3,
        initialDelayMs = 1000,
        maxDelayMs = 8000,
        timeoutMs,
        label
    }: RetryOptions
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await withOptionalTimeout(operation(attempt), timeoutMs, label);
        } catch (error) {
            lastError = error;

            if (attempt >= attempts) {
                break;
            }

            const delayMs = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
            console.warn(`${label} attempt ${attempt}/${attempts} failed: ${describeError(error)}. Retrying in ${delayMs}ms...`);
            await sleep(delayMs);
        }
    }

    throw new Error(`${label} failed after ${attempts} attempts: ${describeError(lastError)}`);
}

function withOptionalTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined, label: string): Promise<T> {
    if (!timeoutMs) return promise;

    let timeout: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
            reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

export function describeError(error: unknown): string {
    if (error instanceof Error) {
        const cause = getCause(error);
        return cause ? `${error.name}: ${error.message} (${cause})` : `${error.name}: ${error.message}`;
    }

    return String(error);
}

function getCause(error: Error): string | undefined {
    const cause = (error as Error & { cause?: unknown }).cause;

    if (!cause) return undefined;

    if (cause instanceof Error) {
        const code = (cause as Error & { code?: string }).code;
        return code ? `${cause.name}: ${cause.message}; code=${code}` : `${cause.name}: ${cause.message}`;
    }

    return String(cause);
}
