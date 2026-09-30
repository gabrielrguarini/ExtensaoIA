export type HardwareStatus =
  | { state: 'checking' }
  | { state: 'unavailable' }
  | {
      state: 'available';
      shaderF16: boolean;
      maxStorageBufferBindingSize: number;
      maxBufferSize: number;
    };

/** Limites expostos pelo adaptador; WebGPU não informa VRAM livre. */
export async function probeHardware(): Promise<HardwareStatus> {
  const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
  if (!gpu) return { state: 'unavailable' };
  try {
    const adapter = await Promise.race([
      gpu.requestAdapter({ powerPreference: 'high-performance' }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 7_000)),
    ]);
    if (!adapter) return { state: 'unavailable' };
    return {
      state: 'available',
      shaderF16: adapter.features.has('shader-f16'),
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    };
  } catch {
    return { state: 'unavailable' };
  }
}
