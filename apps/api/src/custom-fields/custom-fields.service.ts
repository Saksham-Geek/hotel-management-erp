import { BadRequestException, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';

interface Def { key: string; label: string; field_type: string; required: boolean; options: string[] | null }

@Injectable()
export class CustomFieldsService {
  /**
   * Checks submitted custom values against the tenant's field definitions for an entity and
   * returns only known, correctly typed values. Rejects unknown keys so JSONB can't be used as a dumping ground.
   */
  async validate(c: PoolClient, entity: string, values: Record<string, unknown>): Promise<Record<string, unknown>> {
    const defs: Def[] = (
      await c.query(`select key, label, field_type, required, options from custom_field_definitions where entity = $1`, [entity])
    ).rows;
    const errors: Record<string, string> = {};
    const clean: Record<string, unknown> = {};
    const known = new Set(defs.map((d) => d.key));

    for (const k of Object.keys(values)) if (!known.has(k)) errors[k] = 'Unknown field';

    for (const d of defs) {
      const v = values[d.key];
      if (v === undefined || v === null || v === '') {
        if (d.required) errors[d.key] = `${d.label} is required`;
        continue;
      }
      switch (d.field_type) {
        case 'text': if (typeof v === 'string' && v.length <= 500) clean[d.key] = v; else errors[d.key] = 'Enter text up to 500 characters'; break;
        case 'number': if (typeof v === 'number' && Number.isFinite(v)) clean[d.key] = v; else errors[d.key] = 'Enter a number'; break;
        case 'boolean': if (typeof v === 'boolean') clean[d.key] = v; else errors[d.key] = 'Choose yes or no'; break;
        case 'date': if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) clean[d.key] = v; else errors[d.key] = 'Use the format YYYY-MM-DD'; break;
        case 'select': if (typeof v === 'string' && d.options?.includes(v)) clean[d.key] = v; else errors[d.key] = 'Choose one of the listed options'; break;
      }
    }
    if (Object.keys(errors).length) {
      throw new BadRequestException({ statusCode: 400, code: 'CUSTOM_FIELDS_INVALID', message: 'Some custom fields are invalid', errors });
    }
    return clean;
  }
}
