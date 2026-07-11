"use client";

// ReviewModal: lets a guest leave a rating (1–5 stars) and an optional comment for a
// completed booking. Submits to POST /api/reviews; the backend enforces that the stay
// is completed and that only one review exists per booking.
import { useEffect, useState } from "react";

import { Icon } from "@/components/Icon";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

// Renders the review dialog (star picker + comment) and submits it for a booking.
export function ReviewModal({
  bookingId,
  listingTitle,
  onClose,
  onSubmitted,
}: {
  bookingId: number;
  listingTitle: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  async function submit() {
    if (rating < 1) {
      toast("Please pick a star rating.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await api.reviews.create({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      toast("Thanks for your review!", "success");
      onSubmitted();
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Could not submit your review. Please try again.",
        "error",
      );
      setSubmitting(false);
    }
  }

  const shown = hover || rating;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Leave a review"
        className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-[var(--shadow-card)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Leave a review</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink hover:bg-muted"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <p className="mt-1 truncate text-sm text-ink-soft">{listingTitle}</p>

        {/* star picker */}
        <div className="mt-5">
          <span className="mb-2 block text-sm font-medium text-ink">Your rating</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Rating out of 5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                className={`transition-transform hover:scale-110 ${
                  n <= shown ? "text-accent" : "text-line-strong"
                }`}
              >
                <Icon name="star" size={30} />
              </button>
            ))}
          </div>
        </div>

        {/* comment */}
        <label className="mt-5 block">
          <span className="mb-1.5 block text-sm font-medium text-ink">
            Comment <span className="text-ink-faint">(optional)</span>
          </span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Share a few details about your stay…"
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="mt-5 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </div>
  );
}
