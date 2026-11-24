'use client';

import { useEffect, useState } from 'react';
import StatCards from '@/components/admin/StatCards';
import RecentOrders from '@/components/admin/RecentOrders';
import SalesDonut from '@/components/admin/SalesDonut';
import DeliveryProgress from '@/components/admin/DeliveryProgress';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/admin/catalog/dashboard', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Could not load live dashboard data.');
        }

        return response.json();
      })
      .then(setData)
      .catch((reason) => {
        if (reason.name !== 'AbortError') {
          setError(reason.message);
        }
      });

    return () => controller.abort();
  }, []);

  if (error) {
    return <p role="alert" className="rounded-card border border-red-200 bg-white p-6 text-sm text-red-700">{error}</p>;
  }

  if (!data) {
    return <div className="rounded-card border border-taupe-200 bg-white p-8 text-sm text-taupe-600">Loading live dashboard data…</div>;
  }

  return (
    <div className="grid gap-6">
      <StatCards stats={data.stats} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <RecentOrders orders={data.recentOrders} />
        <div className="grid gap-6">
          <SalesDonut categories={data.categorySales} />
          <DeliveryProgress counts={data.statusCounts} />
        </div>
      </div>
      <p className="text-xs text-taupe-600">
        Live database metrics. Delivered order value is not the same as reconciled COD cash.
      </p>
    </div>
  );
}
