import { PageStub } from "@/components/PageStub";

export default function NewListingPage() {
  return (
    <PageStub
      eyebrow="Host"
      title="Create a new listing"
      description="The multi-step listing creation form — details, location, price, amenities, and photos — will live here."
      cta={{ href: "/host", label: "Back to dashboard" }}
    />
  );
}
