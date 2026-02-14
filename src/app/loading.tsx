import Image from "next/image";

export default function Loading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-brand-cream">
      <Image
        src="/logo-dark.jpg"
        alt="Klaserie Camps"
        width={200}
        height={100}
        className="mb-6"
        priority
      />
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-khaki/30 border-t-brand-brown" />
    </main>
  );
}
