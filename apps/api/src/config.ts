import './load-env';
import { parseApiEnv } from './env-validation';

export const env = parseApiEnv(process.env);
