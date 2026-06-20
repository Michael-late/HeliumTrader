/**
 * Maps AI SDK / AI Gateway errors into a clear, user-facing message.
 *
 * By default `toUIMessageStreamResponse()` masks stream errors as a generic
 * "An error occurred" for security. For this app the most common failure is the
 * Vercel AI Gateway rejecting requests until a credit card is on file, so we
 * surface that exact, actionable guidance instead of a vague error.
 */
export function formatAiStreamError(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const lower = message.toLowerCase();

  if (
    lower.includes("credit card") ||
    lower.includes("customer_verification_required") ||
    lower.includes("unlock your free credits")
  ) {
    return (
      "AI reports are blocked because the Vercel AI Gateway has no payment method on file. " +
      "Add a credit card to your Vercel team's AI settings to unlock free credits, then try again."
    );
  }

  if (lower.includes("rate limit") || lower.includes("429")) {
    return "The AI provider is rate limiting requests right now. Please wait a moment and try again.";
  }

  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")) {
    return "The AI provider rejected the request due to an authentication problem. Check your AI Gateway configuration.";
  }

  return message || "The AI provider could not generate this report. Please try again.";
}
