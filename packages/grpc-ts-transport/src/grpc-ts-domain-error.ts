export class GrpcTsDomainError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly domain: string,
    public readonly metadata?: Record<string, string> | undefined,
  ) {
    super(message)
  }
}
