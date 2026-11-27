'use client';
import { useParams } from 'next/navigation';
import { useFetch } from '@/lib/admin-api';
import { Alert, PageHeader, Spinner } from '@/components/admin/ui/kit';
import ComboForm from '@/components/admin/combos/ComboForm';
export default function EditCombo() {
  const { id } = useParams(); const { data, error } = useFetch(`/ops/combos/${id}`);
  if (error) return <Alert>{error}</Alert>; if (!data) return <Spinner />;
  return <><PageHeader title={`Edit ${data.name}`} /><ComboForm combo={data} /></>;
}
