import Link from 'next/link';
import Container from './Container';

export function Section({ className = '', children, ...props }) {
  return <section className={`pt-10 sm:pt-14 ${className}`} {...props}><Container>{children}</Container></section>;
}

export function SectionHead({ title, href, linkText = 'View all', sub }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-brown sm:text-2xl">{title}</h2>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {href && <Link href={href} className="shrink-0 text-sm font-medium text-ink underline-offset-4 hover:underline">{linkText} →</Link>}
    </div>
  );
}

export const PageTitle = ({ className = '', children }) => (
  <h1 className={`mb-5 mt-1 text-3xl font-bold text-brown sm:text-4xl ${className}`}>{children}</h1>
);
