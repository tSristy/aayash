export default function Badge({ className = '', ...props }) {
  return <span className={`rounded-lg bg-brown px-2.5 py-0.5 text-xs font-bold text-white ${className}`} {...props} />;
}
