import StatCards from '@/components/admin/StatCards';
import RecentOrders from '@/components/admin/RecentOrders';
import SalesDonut from '@/components/admin/SalesDonut';
import DeliveryProgress from '@/components/admin/DeliveryProgress';

export default function Dashboard() {
  return (
    <div className="grid gap-6">
      <StatCards />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <RecentOrders />
        <div className="grid gap-6">
          <SalesDonut />
          <DeliveryProgress />
        </div>
      </div>
      <p className="text-xs text-taupe-600">Figures shown are sample data until the admin API is connected.</p>
    </div>
  );
}
