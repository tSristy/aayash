'use client';
import { useFetch } from '@/lib/admin-api';

export const STATUS_ORDER = ['placed', 'pending', 'confirmed', 'wfp', 'packaging', 'packed', 'out_for_delivery', 'partial_delivered', 'delivered', 'return_pending', 'returned', 'cancelled'];
export const TRANSITIONS = {
  placed: ['pending', 'confirmed', 'cancelled'], pending: ['confirmed', 'wfp', 'cancelled'], wfp: ['pending', 'confirmed', 'cancelled'],
  confirmed: ['pending', 'wfp', 'packaging', 'packed', 'cancelled'], packaging: ['packed', 'cancelled'], packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'partial_delivered', 'return_pending', 'cancelled'], partial_delivered: ['return_pending'],
  delivered: ['return_pending'], return_pending: ['returned', 'delivered'], returned: [], cancelled: [],
};
export const STATUS_ICON_TONE = { cancelled: 'danger', returned: 'danger', return_pending: 'danger' };

/** Statuses, sources, note presets and staff for forms and filters. */
export function useOrderMeta() {
  const { data } = useFetch('/orders/meta');
  return data || { statuses: {}, sources: [], presets: [], admins: [], editable: [] };
}
export const statusLabel = (meta, s) => meta.statuses?.[s] || String(s).replace(/_/g, ' ');
