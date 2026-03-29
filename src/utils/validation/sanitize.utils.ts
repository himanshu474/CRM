/**
 * Basic XSS sanitization
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === "string") {
    return input.replace(/<[^>]*>?/gm, "");
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }

  return input;
};