export default function Container({ className = '', ...props }) {
  return <div className={`mx-auto w-full max-w-container px-6 ${className}`} {...props} />;
}
