import { getSupabaseClient } from './config'
import { errorEmitter } from './error-emitter'
import { SupabasePermissionError } from './errors'

function handleError(table: string, operation: string, error: { message: string; code?: string }) {
  console.error(`[non-blocking ${operation}] ${table}:`, error.message)

  if (error.code === '42501' || error.message.includes('permission denied')) {
    errorEmitter.emit(
      'permission-error',
      new SupabasePermissionError({ table, operation, details: error.message })
    )
  }
}

/**
 * Upsert a row (insert or update on conflict). Replaces setDocumentNonBlocking.
 */
export function upsertNonBlocking(table: string, data: object) {
  const supabase = getSupabaseClient()
  supabase
    .from(table)
    .upsert(data)
    .then(({ error }: { error: { message: string; code?: string } | null }) => {
      if (error) handleError(table, 'upsert', error)
    })
}

/**
 * Insert a new row. Replaces addDocumentNonBlocking.
 */
export function insertNonBlocking(table: string, data: object) {
  const supabase = getSupabaseClient()
  supabase
    .from(table)
    .insert(data)
    .then(({ error }: { error: { message: string; code?: string } | null }) => {
      if (error) handleError(table, 'insert', error)
    })
}

/**
 * Update an existing row by id. Replaces updateDocumentNonBlocking.
 */
export function updateNonBlocking(table: string, id: string, data: object) {
  const supabase = getSupabaseClient()
  supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .then(({ error }: { error: { message: string; code?: string } | null }) => {
      if (error) handleError(table, 'update', error)
    })
}

/**
 * Delete a row by id. Replaces deleteDocumentNonBlocking.
 */
export function deleteNonBlocking(table: string, id: string) {
  const supabase = getSupabaseClient()
  supabase
    .from(table)
    .delete()
    .eq('id', id)
    .then(({ error }: { error: { message: string; code?: string } | null }) => {
      if (error) handleError(table, 'delete', error)
    })
}
