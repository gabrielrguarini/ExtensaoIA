import { createServer } from 'vite';
import { writeFile } from 'node:fs/promises';
const server = await createServer({
  configFile: false,
  publicDir: false,
  envPrefix: [],
  server: { middlewareMode: true },
});
try {
  const { runValidatorControls } = await server.ssrLoadModule('/tests/benchmark/controls.ts');
  const results = await runValidatorControls();
  await writeFile(
    '.cache/step15-controls.json',
    JSON.stringify(
      { synthetic: true, generatedByModel: false, reviewedBeforeExecution: true, results },
      null,
      2,
    ) + '\n',
  );
  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
  if (results.some((row) => row.falseNegative)) process.exitCode = 2;
} finally {
  await server.close();
}
