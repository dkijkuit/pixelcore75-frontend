// src/utils/panels.ts
import type { Px75Panel } from '@/service/panels'

export const panelTypes = ["P_64_X_32", "P_64_X_64"];

export function getScreenCount(p: Px75Panel): number {
  return p.config?.screensConfig?.length ?? 0
}

export function getScreenTypesUnique(p: Px75Panel): string[] {
  const types = p.config?.screensConfig?.map(s => s.screenType) ?? []
  return Array.from(new Set(types))
}

export function isConfigured(p: Px75Panel): boolean {
  return !!(p.config && p.config.screensConfig && p.config.screensConfig.length > 0)
}

export type RowLike<T extends object> = { item: T } | { raw: T } | T

export function getRowItem<T extends object>(row: RowLike<T>): T {
  // row is guaranteed to be an object (T extends object), so 'in' is ok
  if ('item' in row) return row.item
  if ('raw' in row) return row.raw
  return row
}
