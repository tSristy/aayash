import Icon from './Icon';
import { money } from '@/lib/format';

export default function StatCards({ stats }) {
  const values = [
    {
      label: 'Delivered order value',
      value: money(stats.deliveredValue),
      hint: 'Not COD cash reconciliation',
      icon: 'money',
    },
    {
      label: 'Orders',
      value: Number(stats.totalOrders).toLocaleString('en-US'),
      hint: 'All order statuses',
      icon: 'orders',
    },
    {
      label: 'Active products',
      value: Number(stats.activeProducts).toLocaleString('en-US'),
      hint: 'Published catalog records',
      icon: 'customers',
    },
    {
      label: 'Low stock variants',
      value: Number(stats.lowStockVariants).toLocaleString('en-US'),
      hint: '5 units or fewer',
      icon: 'alert',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {values.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between rounded-card border border-taupe-200 bg-white p-5"
        >
          <div>
            <p className="text-sm text-taupe-600">{item.label}</p>
            <p className="mt-1 font-display text-[28px] font-bold leading-tight">
              {item.value}
            </p>
            <p className="mt-1 text-xs font-medium text-taupe-600">{item.hint}</p>
          </div>
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary-deep">
            <Icon name={item.icon} />
          </span>
        </div>
      ))}
    </div>
  );
}
