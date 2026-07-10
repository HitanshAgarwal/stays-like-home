import { PageStub } from "@/components/PageStub";

export default function TripsPage() {
  return (
    <PageStub
      eyebrow="Guest"
      title="My trips"
      description="Your upcoming and past bookings will appear here, with the ability to cancel and to review completed stays."
      cta={{ href: "/", label: "Find a stay" }}
    />
  );
}
