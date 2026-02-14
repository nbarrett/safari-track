import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-brand-cream">
      <Image
        src="/logo-icon.png"
        alt="Safari Track"
        width={80}
        height={80}
        className="mb-6 rounded-2xl"
        priority
      />
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-khaki/30 border-t-brand-brown" />
    </main>
  );
}
