export default function ProductGrid({ children }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">{children}</div>;
}
