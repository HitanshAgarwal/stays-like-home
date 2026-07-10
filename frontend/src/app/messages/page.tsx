// Messages page: placeholder for guest↔host messaging (not built for this scope).
import { PageStub } from "@/components/PageStub";

// Renders a "coming soon" stub for the messaging feature.
export default function MessagesPage() {
  return (
    <PageStub
      eyebrow="Coming soon"
      title="Messages"
      description="Direct messaging between guests and hosts is on the way. You'll be able to ask questions and coordinate your stay here."
      cta={{ href: "/", label: "Back to explore" }}
    />
  );
}
