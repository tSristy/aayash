import Link from 'next/link';

const base = 'inline-flex items-center justify-center rounded-none border text-xs font-semibold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const variants = {
  primary: 'border-[#A65A3E] bg-[#A65A3E] text-white hover:border-[#8F4B32] hover:bg-[#8F4B32]',
  outline: 'border-[#2E261F] bg-transparent text-[#2E261F] hover:bg-[#F5F1EB]',
  dark: 'border-[#2E261F] bg-[#2E261F] text-white hover:bg-[#3D342B]',
};
const sizes = { sm: 'px-3.5 py-2', md: 'px-5 py-3', lg: 'px-8 py-3.5' };

export default function Button({ href, variant = 'primary', size = 'md', block = false, className = '', ...props }) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${block ? 'w-full' : ''} ${className}`;
  return href ? <Link href={href} className={cls} {...props} /> : <button className={cls} {...props} />;
}