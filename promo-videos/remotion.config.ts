import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.setPublicDir(path.join(process.cwd(), 'public'));

