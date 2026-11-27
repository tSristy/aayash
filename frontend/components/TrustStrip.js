import Container from './ui/Container';
import { CashIcon, HeadsetIcon, LeafIcon, TruckIcon } from './ui/Icons';
import { money } from '@/lib/format';

export default function TrustStrip({ settings = {} }) {
  const free = Number(settings.free_delivery_min_order) > 0 ? `Free delivery over ${money(settings.free_delivery_min_order)}` : 'Delivery charge shown at checkout';
  const items = [
    [CashIcon, 'Cash on delivery', 'Pay when your order arrives'],
    [LeafIcon, 'Fresh every day', 'Packed to order from fresh stock'],
    [HeadsetIcon, 'Order support', 'We help if anything goes wrong'],
    [TruckIcon, free, settings.delivery_area_text || 'Fast, careful delivery'],
  ];
  return (
    <Container className="mt-12 sm:mt-14">
      <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map(([Icon, title, text]) => (
          <div key={title} className="flex items-center gap-3.5 bg-white px-5 py-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tint text-brown"><Icon size={22} /></span>
            <div><p className="text-sm font-semibold text-ink">{title}</p><p className="text-xs text-muted">{text}</p></div>
          </div>
        ))}
      </div>
    </Container>
  );
}
