const engine = process.env.STEP15H_ENGINE ?? 'chrome';
process.env.STEP15F_CHROME = process.env.STEP15H_CHROME;
process.env.STEP15F_ENGINE = engine;
process.env.STEP15F_REGULAR = engine === 'chrome' ? '1' : '0';
process.env.STEP15F_VALIDATION = 'step15h';
await import('./step15f-interface.mjs');
