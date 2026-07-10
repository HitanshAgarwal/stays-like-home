"use client";

// Edit listing page: auth-guarded host page that loads a listing by id, verifies the
// current user owns it (else shows forbidden/not-found), and renders the ListingForm in
// "edit" mode pre-filled with the existing values.
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/Icon";
import { ListingForm, listingToForm, type ListingFormValues } from "@/components/ListingForm";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { ListingDetail } from "@/lib/types";

// Page component: resolves the route id, guards auth + ownership, and renders the edit form.
export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [initial, setInitial] = useState<ListingFormValues | null>(null);
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notfound" | "forbidden">("loading");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    async function run() {
      try {
        const detail = await api.listings.get(id);
        if (controller.signal.aborted) return;
        if (detail.host_id !== user!.id) {
          setState("forbidden");
          return;
        }
        setListing(detail);
        setInitial(listingToForm(detail));
        setState("ready");
      } catch (err) {
        if (controller.signal.aborted) return;
        setState(err instanceof ApiError && err.status === 404 ? "notfound" : "notfound");
      }
    }
    run();
    return () => controller.abort();
  }, [id, user]);

  if (authLoading || !user || state === "loading") {
    return <div className="mx-auto max-w-3xl animate-pulse px-4 py-16" />;
  }
  if (state === "notfound") return <Message title="Listing not found" />;
  if (state === "forbidden")
    return <Message title="You can only edit your own listings" />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
      <Link
        href="/host"
        className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
      >
        <Icon name="arrow_back" size={16} />
        Back to dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
        Edit “{listing?.title}”
      </h1>
      <div className="mt-8">
        <ListingForm mode="edit" listingId={Number(id)} initial={initial!} />
      </div>
    </div>
  );
}

// Centered message screen (not-found / forbidden) with a link back to the dashboard.
function Message({ title }: { title: string }) {
  return (
    <div className="py-24 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <Link href="/host" className="mt-4 inline-block font-semibold text-accent hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
