import { config } from 'dotenv';
import { resolve } from 'path';
// Resolve from this file so startup works both through pnpm and from the repo root.
config({ path: resolve(__dirname, '../../../.env') });
config();
