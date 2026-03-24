export class SupabasePermissionError extends Error {
  public readonly table: string
  public readonly operation: string
  public readonly details?: string

  constructor(opts: { table: string; operation: string; details?: string }) {
    super(
      `Permission denied: ${opts.operation} on ${opts.table}${opts.details ? ` — ${opts.details}` : ''}`
    )
    this.name = 'SupabasePermissionError'
    this.table = opts.table
    this.operation = opts.operation
    this.details = opts.details
  }
}
