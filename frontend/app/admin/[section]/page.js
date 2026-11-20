import { notFound } from 'next/navigation';
import Icon from '@/components/admin/Icon';
import { NAV } from '@/components/admin/nav';

// Placeholder for sidebar sections that do not have their own page yet.
export default function AdminSection({ params }) {
  const item = NAV.find((n) => n.href === `/admin/${params.section}`);
  if (!item) notFound();
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-taupe-200 bg-white px-6 py-20 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/15 text-primary-deep"><Icon name={item.icon} size={26} /></span>
      <h2 className="text-xl">{item.label}</h2>
      <p className="mt-1 text-taupe-600">This section is ready for its layout.</p>
    </div>
  );
}
