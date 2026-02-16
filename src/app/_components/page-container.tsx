export function PageContainer({
  children,
  maxWidth = "max-w-3xl",
  className = "",
}: {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative z-10 mx-auto ${maxWidth} px-4 pb-8 pt-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}
