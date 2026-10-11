import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

/** Turns Postgres constraint errors into clean HTTP errors; passes Nest HttpExceptions through. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly log = new Logger('Errors');

  catch(err: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (err instanceof HttpException) {
      const body = err.getResponse();
      return res.status(err.getStatus()).json(typeof body === 'string' ? { statusCode: err.getStatus(), message: body } : body);
    }

    const code: string | undefined = err?.code;
    const constraint: string | undefined = err?.constraint;
    if (code === '23P01' && ['no_double_booking', 'no_double_booking_time'].includes(constraint ?? '')) {
      return res.status(409).json({ statusCode: 409, code: 'ROOM_UNAVAILABLE', message: 'That room is already booked for these dates' });
    }
    if (code === '23505') {
      return res.status(409).json({ statusCode: 409, code: 'ALREADY_EXISTS', message: 'A record with these details already exists' });
    }
    if (code === '23503') {
      return res.status(400).json({ statusCode: 400, code: 'BAD_REFERENCE', message: 'A referenced record was not found' });
    }
    if (code === '22P02' || code === '22007' || code === '22008') {
      return res.status(400).json({ statusCode: 400, code: 'BAD_VALUE', message: 'A value has the wrong format' });
    }

    this.log.error(err?.stack ?? String(err));
    return res.status(500).json({ statusCode: 500, code: 'INTERNAL', message: 'Something went wrong on our side' });
  }
}
