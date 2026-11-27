'use client';
import { useFetch } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { Select } from '../ui/kit';

export function useAccounts() { return useFetch('/ops/accounts'); }

export function AccountSelect({ value, onChange, label = 'Account', required, showBalance = true, ...rest }) {
  const { data } = useAccounts();
  const items = (data?.items || []).filter((a) => a.is_active);
  return <Select label={label} required={required} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Choose account" options={items.map((a) => ({ value: String(a.id), label: showBalance ? `${a.name} · ${taka(a.balance)}` : a.name }))} {...rest} />;
}
