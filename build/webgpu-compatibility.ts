import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Plugin } from 'vite';

const originalCall = 'navigator.gpu.requestAdapter({ powerPreference })';
const compatibleCall =
  'navigator.gpu.requestAdapter(navigator.platform.startsWith("Win") ? {} : { powerPreference })';
const modificationNotice =
  '/* WebLLM 0.2.82 modified locally: omit ignored WebGPU powerPreference on Windows. See NOTICE.txt and licenses/WEBLLM-LICENSE. */\n';

function isWebLlmModule(id: string): boolean {
  return id.replaceAll('\\', '/').endsWith('/@mlc-ai/web-llm/lib/index.js');
}

/** Ajuste local do runtime fixado, sem alterar node_modules nem ocultar avisos/erros. */
export function patchWebLlmGpuPreference(source: string): string {
  if (source.split(originalCall).length !== 2)
    throw new Error('Chamada WebGPU do WebLLM mudou; revisar a compatibilidade antes do build.');
  return source.replace(originalCall, compatibleCall);
}

export function webGpuCompatibility(): Plugin {
  return {
    name: 'webllm-windows-adapter-preference',
    enforce: 'pre',
    async transform(source, id) {
      const file = id.split('?')[0]!;
      if (!isWebLlmModule(file)) return;
      const metadata: unknown = JSON.parse(
        await readFile(path.join(path.dirname(file), '..', 'package.json'), 'utf8'),
      );
      if (
        typeof metadata !== 'object' ||
        metadata === null ||
        !('version' in metadata) ||
        metadata.version !== '0.2.82'
      )
        throw new Error('Versão WebLLM diferente de 0.2.82; revisar o ajuste de WebGPU.');
      return { code: patchWebLlmGpuPreference(source), map: null };
    },
    generateBundle(_options, bundle) {
      // Após a minificação, para que o aviso de distribuição permaneça no arquivo modificado.
      for (const artifact of Object.values(bundle))
        if (
          artifact.type === 'chunk' &&
          artifact.code.includes('requestAdapter(navigator.platform.startsWith(')
        )
          artifact.code = modificationNotice + artifact.code;
    },
  };
}
