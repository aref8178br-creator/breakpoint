const { z } = require('zod');

function assignReqProperty(req, source, data) {
  Object.defineProperty(req, source, {
    value: data,
    writable: true,
    configurable: true,
    enumerable: true
  });
}

function validate(schema, source = 'query') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.') || source,
          message: i.message
        }))
      });
    }
    assignReqProperty(req, source, result.data);
    next();
  };
}

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const hotelSearchSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    country: z.string().trim().min(1).max(100).optional(),
    stars: z.coerce.number().int().min(1).max(5).optional(),
    minPrice: z.coerce.number().nonnegative().optional(),
    maxPrice: z.coerce.number().nonnegative().optional(),
    amenity: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) =>
        v
          ? v
              .split(',')
              .map((x) => parseInt(x.trim(), 10))
              .filter((n) => Number.isInteger(n) && n > 0)
          : undefined
      ),
    sortBy: z.enum(['price_asc', 'price_desc', 'stars_desc', 'name_asc']).optional(),
    checkin: z.string().regex(DATE_RE, 'checkin must be YYYY-MM-DD').optional(),
    checkout: z.string().regex(DATE_RE, 'checkout must be YYYY-MM-DD').optional(),
    page: z.coerce.number().int().positive().max(10000).default(1),
    pageSize: z.coerce.number().int().positive().max(50).default(20)
  })
  .refine((v) => !v.minPrice || !v.maxPrice || v.minPrice <= v.maxPrice, {
    message: 'minPrice must be less than or equal to maxPrice',
    path: ['minPrice']
  })
  .refine((v) => !v.checkin || !v.checkout || v.checkin <= v.checkout, {
    message: 'checkin must be on or before checkout',
    path: ['checkin']
  });

const suggestSchema = z.object({
  q: z.string().trim().min(1).max(100),
  limit: z.coerce.number().int().positive().max(10).default(5)
});

const dateRangeSchema = z
  .object({
    checkin: z.string().regex(DATE_RE, 'checkin must be YYYY-MM-DD').optional(),
    checkout: z.string().regex(DATE_RE, 'checkout must be YYYY-MM-DD').optional()
  })
  .refine((v) => !v.checkin || !v.checkout || v.checkin <= v.checkout, {
    message: 'checkin must be on or before checkout',
    path: ['checkin']
  });

module.exports = {
  validate,
  idParamSchema,
  hotelSearchSchema,
  suggestSchema,
  dateRangeSchema
};
