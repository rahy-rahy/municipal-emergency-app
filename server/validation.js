'use strict';

const { z } = require('zod');

const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(8, 'Password must be at least 8 characters.').max(200);
const fullName = z.string().trim().min(2).max(120);
const phone = z.string().trim().max(40).optional().or(z.literal(''));

const registerSchema = z.object({
  email,
  password,
  fullName,
  phone
});

const loginSchema = z.object({
  email,
  password: z.string().min(1).max(200)
});

const reportSchema = z.object({
  type: z.enum(['fire', 'robbery', 'flood', 'electricity', 'medical', 'other']),
  description: z.string().trim().max(1000).optional().or(z.literal('')),
  lat: z.coerce.number().gte(-90).lte(90).optional(),
  lng: z.coerce.number().gte(-180).lte(180).optional(),
  needHelp: z.coerce.boolean().optional(),
  isSafe: z.coerce.boolean().optional()
});

const reportStatusSchema = z.object({
  status: z.enum(['sent', 'received', 'in_progress', 'resolved'])
});

const broadcastSchema = z.object({
  title: z.string().trim().min(2).max(140),
  message: z.string().trim().min(2).max(2000),
  severity: z.enum(['standard', 'time_sensitive', 'critical']),
  lat: z.coerce.number().gte(-90).lte(90).optional(),
  lng: z.coerce.number().gte(-180).lte(180).optional(),
  radiusKm: z.coerce.number().gte(0).lte(100).optional()
});

const roleChangeSchema = z.object({
  role: z.enum(['resident', 'support', 'admin'])
});

const statusChangeSchema = z.object({
  status: z.enum(['pending', 'verified', 'rejected'])
});

// Runs a schema and returns { ok, data } or { ok:false, error }.
function validate(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first ? first.message : 'Invalid input.' };
  }
  return { ok: true, data: result.data };
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  reportSchema,
  reportStatusSchema,
  broadcastSchema,
  roleChangeSchema,
  statusChangeSchema
};
