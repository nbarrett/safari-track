/**
 * Standard page container that reserves right padding for the mobile burger menu.
 * Use this as the inner content wrapper on all standard pages to prevent
 * the burger menu from being overlapped by page content.
 */
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
      className={`relative z-10 mx-auto ${maxWidth} px-4 pr-12 pb-8 pt-4 sm:px-6 lg:px-8 lg:pr-8 ${className}`}
    >
      {children}
    </div>
  );
}
