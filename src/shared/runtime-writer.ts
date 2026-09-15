// Main elects one runtime projection writer; readers never author received runtime events.
export type RuntimeWriterLease = { token?: string; validForMs: number }
export const RUNTIME_WRITER_LEASE_MS = 20_000
export const RUNTIME_WRITER_LOST = 'SESSION_RUNTIME_WRITER_LOST'
