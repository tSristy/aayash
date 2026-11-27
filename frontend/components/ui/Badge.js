export default function Badge({ className = '', tone = 'accent', ...props }) {
  const tones = { accent: 'bg-accent text-ink', brown: 'bg-brown text-white', soft: 'bg-tint text-brown' };
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold leading-4 ${tones[tone]} ${className}`} {...props} />;
}
