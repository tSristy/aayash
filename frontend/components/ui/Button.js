import Link from 'next/link';

const base = 'inline-flex items-center justify-center rounded-xl border-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const variants = {
  primary: 'border-primary bg-primary text-ink hover:border-primary-hover hover:bg-primary-hover',
  outline: 'border-ink bg-transparent text-ink hover:bg-tint',
  dark: 'border-ink bg-ink text-white',
};
const sizes = { sm: 'px-3 py-[7px] text-sm', md: 'px-[18px] py-2.5', lg: 'px-6 py-3.5 text-base' };

export default function Button({ href, variant = 'primary', size = 'md', block = false, className = '', ...props }) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`;
  return href ? <Link href={href} className={cls} {...props} /> : <button className={cls} {...props} />;
}
