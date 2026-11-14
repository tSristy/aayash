import Link from 'next/link';
import Container from './Container';

export function Section({ className = '', children, ...props }) {
  return <section className={`pt-14 ${className}`} {...props}><Container>{children}</Container></section>;
}

export function SectionHead({ title, href, linkText = 'View all' }) {
  return (
    <div className="mb-5 flex items-baseline justify-between">
      <h2 className="text-[28px]">{title}</h2>
      {href && <Link href={href} className="font-bold text-primary-deep">{linkText}</Link>}
    </div>
  );
}

export const PageTitle = ({ children }) => <h1 className="mb-6 mt-2 text-4xl">{children}</h1>;
