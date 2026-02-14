import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-brand-cream">
      <Image
        src="/logo-icon.png"
        alt="Safari Track"
        width={360}
        height={240}
        className="mb-6 w-40"
        priority
      />
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-khaki/30 border-t-brand-brown" />
    </main>
  );
}
