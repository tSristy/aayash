'use client';
import { useRouter } from 'next/navigation';
import { post } from '@/lib/admin-api';
import { PageHeader, useToast } from '@/components/admin/ui/kit';
import OrderForm from '@/components/admin/orders/OrderForm';

export default function NewOrder() {
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <PageHeader title="Create order" subtitle="Phone, Messenger or WhatsApp orders taken by your team." />
      <OrderForm submitLabel="Create order" onSubmit={async (payload) => {
        const r = await post('/orders', payload);
        toast(`Order ${r.order_no} created`);
        router.push(`/admin/orders/${r.id}`);
      }} />
    </>
  );
}
