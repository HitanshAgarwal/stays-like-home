"use client";

// New listing page: auth-guarded host page that renders the ListingForm in "create" mode.
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { ListingForm } from "@/components/ListingForm";
import { useAuth } from "@/lib/auth-context";

// Page component: redirects unauthenticated users to login, otherwise shows the create form.
export default function NewListingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <div className="mx-auto max-w-3xl px-4 py-16" />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Create a new listing</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Fill in the details below. You can edit everything later.
      </p>
      <div className="mt-8">
        <ListingForm mode="create" />
      </div>
    </div>
  );
}
