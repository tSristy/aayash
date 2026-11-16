import Link from 'next/link';
import Container from './Container';

export function Section({ className = '', children, ...props }) {
  return <section className={`pt-14 ${className}`} {...props}><Container>{children}</Container></section>;
}

export function SectionHead({ title, href, linkText = 'View all' }) {
  return (
    <div className="mb-6 flex items-baseline justify-between border-b border-[#E2D9CE] pb-3">
      <h2 className="font-serif text-[28px] font-normal text-[#2E261F] sm:text-[32px]">{title}</h2>
      {href && <Link href={href} className="text-xs font-semibold uppercase tracking-widest text-[#A65A3E] hover:text-[#2E261F]">{linkText}</Link>}
    </div>
  );
}

export const PageTitle = ({ className = '', children }) => (
  <h1 className={`mb-6 mt-2 font-serif text-4xl font-normal text-[#2E261F] ${className}`}>{children}</h1>
);