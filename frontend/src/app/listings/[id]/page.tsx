import { PageStub } from "@/components/PageStub";

// In Next 16, dynamic route params are async and must be awaited.
export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageStub
      eyebrow="Listing"
      title={`Listing #${id}`}
      description="The full listing detail — photos, amenities, host, reviews, and a booking panel — will be built here in a later phase."
      cta={{ href: "/", label: "Back to explore" }}
    />
  );
}
