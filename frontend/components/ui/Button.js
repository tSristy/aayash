import Link from 'next/link';

const base = 'inline-flex items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const variants = {
  primary: 'border-primary bg-primary text-ink hover:border-primary-hover hover:bg-primary-hover',
  outline: 'border-line bg-white text-ink hover:border-ink',
  dark: 'border-brown bg-brown text-white hover:bg-ink hover:border-ink',
};
const sizes = { sm: 'px-3.5 py-2', md: 'px-5 py-2.5', lg: 'px-7 py-3' };

export default function Button({ href, variant = 'primary', size = 'md', block = false, className = '', ...props }) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`;
  return href ? <Link href={href} className={cls} {...props} /> : <button className={cls} {...props} />;
}
