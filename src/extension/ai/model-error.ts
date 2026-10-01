/** Falhas locais comuns, sem importar um runtime de outro motor. */
export class ModelEnvironmentError extends Error {
  constructor(
    readonly code:
      | 'WEBGPU_UNAVAILABLE'
      | 'INSUFFICIENT_RESOURCES'
      | 'MODEL_DOWNLOAD'
      | 'DOWNLOAD_REQUIRED'
      | 'CONTEXT_LIMIT'
      | 'UNAVAILABLE',
  ) {
    super(code);
  }
}
