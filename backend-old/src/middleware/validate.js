const AppError = require('../lib/AppError');

/**
 * validate({ params, query, body }) — pass zod schemas for whichever parts
 * of the request need checking. Bad input is rejected here, before it ever
 * reaches a controller or touches the database.
 *
 * Usage: router.get('/:orderId', validate({ params: getOrderParams, query: getOrderQuery }), controller.getOrder)
 */
function validate(schemas) {
  return (req, res, next) => {
    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        return next(
          AppError.badRequest('Request validation failed', 'VALIDATION_ERROR', result.error.flatten().fieldErrors)
        );
      }
      req[part] = result.data; // parsed/coerced values replace the raw input
    }
    next();
  };
}

module.exports = validate;
