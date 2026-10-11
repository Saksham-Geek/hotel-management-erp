import { BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodTypeAny, z } from 'zod';

export class ZodPipe<S extends ZodTypeAny> implements PipeTransform<unknown, z.output<S>> {
  constructor(private readonly schema: S) {}
  transform(value: unknown): z.output<S> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Some fields are invalid',
        issues: result.error.flatten(),
      });
    }
    return result.data;
  }
}
