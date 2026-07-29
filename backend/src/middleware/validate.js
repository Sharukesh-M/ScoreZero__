'use strict';

const { z } = require('zod');

/**
 * Zod validation middleware factory.
 * Usage: router.post('/path', validate(schema), handler)
 *
 * @param {z.ZodSchema} schema - Zod schema to validate req.body against
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      return res.status(400).json({
        error: `Validation failed: ${messages}`,
        code: 'VALIDATION_ERROR',
      });
    }
    req.body = result.data;
    return next();
  };
}

// ─── Reusable schemas ────────────────────────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').optional(),
});

const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'refresh_token is required'),
});

module.exports = { validate, signupSchema, loginSchema, refreshSchema };
