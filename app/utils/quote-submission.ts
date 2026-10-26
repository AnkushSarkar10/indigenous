export interface QuoteSubmission {
  payload: string;
  submissionKey: string;
  body: string;
}

export function prepareQuoteSubmission(
  payload: Record<string, unknown>,
  previous: QuoteSubmission | null,
  mintKey: () => string = () => crypto.randomUUID(),
): QuoteSubmission {
  const serializedPayload = JSON.stringify(payload);
  if (previous?.payload === serializedPayload) return previous;

  const submissionKey = mintKey();
  return {
    payload: serializedPayload,
    submissionKey,
    body: JSON.stringify({ ...payload, submissionKey }),
  };
}
