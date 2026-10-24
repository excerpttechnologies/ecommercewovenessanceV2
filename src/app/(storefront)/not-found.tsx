import { Empty } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <Empty title="We couldn’t find that page" text="The weave you’re looking for may have moved or sold out." href="/" cta="Back to home" />
    </div>
  );
}
