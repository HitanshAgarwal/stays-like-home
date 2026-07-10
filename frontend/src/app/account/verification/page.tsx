// Identity verification page: placeholder for identity checks (not built for this scope).
import { PageStub } from "@/components/PageStub";

// Renders a "coming soon" stub for identity verification.
export default function VerificationPage() {
  return (
    <PageStub
      eyebrow="Coming soon"
      title="Identity verification"
      description="Confirming your identity helps keep the community safe. Verification with a government ID and a selfie will be available here soon."
      cta={{ href: "/", label: "Back to explore" }}
    />
  );
}
