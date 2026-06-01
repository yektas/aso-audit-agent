export type UiErrorState = {
  summary: string
  detail?: string
}

class RequestError extends Error {
  detail?: string

  constructor(summary: string, detail?: string) {
    super(summary)
    this.name = 'RequestError'
    this.detail = detail
  }
}

async function extractErrorDetail(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  try {
    if (contentType.includes('application/json')) {
      const json = (await response.json()) as { error?: unknown; message?: unknown }
      const errorText =
        typeof json.error === 'string'
          ? json.error
          : typeof json.message === 'string'
            ? json.message
            : JSON.stringify(json)

      return errorText.trim() || undefined
    }

    const text = await response.text()
    return text.trim() || undefined
  } catch {
    return undefined
  }
}

export async function readJsonOrThrow<T>(response: Response, fallbackSummary: string): Promise<T> {
  if (!response.ok) {
    throw new RequestError(fallbackSummary, await extractErrorDetail(response))
  }

  return response.json() as Promise<T>
}

export function toUiError(error: unknown, fallbackSummary: string): UiErrorState {
  if (error instanceof RequestError) {
    return {
      summary: error.message || fallbackSummary,
      detail: error.detail,
    }
  }

  if (error instanceof Error) {
    const detail = error.message?.trim() || undefined
    if (!detail || detail === fallbackSummary) {
      return { summary: fallbackSummary }
    }

    return {
      summary: fallbackSummary,
      detail,
    }
  }

  return { summary: fallbackSummary }
}
