/** Chrome no Windows ignora powerPreference e emite aviso se a opção estiver presente. */
export function gpuAdapterOptions(platform: string): GPURequestAdapterOptions {
  return platform.startsWith('Win') ? {} : { powerPreference: 'high-performance' };
}
