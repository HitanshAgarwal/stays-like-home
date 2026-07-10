import { PageStub } from "@/components/PageStub";

export default function HostDashboardPage() {
  return (
    <PageStub
      eyebrow="Host"
      title="Host dashboard"
      description="Manage your listings and see incoming bookings here. For now it's a placeholder while we build the host tools."
      cta={{ href: "/host/listings/new", label: "Create a listing" }}
    />
  );
}
