"use client";

import Link from "next/link";
import { useRef } from "react";
import { aspectFor, sizeClasses } from "@/lib/size";
import { formatPinDate } from "@/lib/date";
import type { PinWithRelations } from "@/lib/types";

export function PinCard({ pin }: { pin: PinWithRelations }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const aspect = pin.image_width && pin.image_height
    ? `${pin.image_width} / ${pin.image_height}`
    : undefined;

  const hasVideo = !!pin.video_url;
  const sourceUrl = pin.source_url;

  function onEnter() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => null);
  }
  function onLeave() {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  }
  function openSource(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (sourceUrl) window.open(sourceUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Link
      href={`/pin/${pin.id}`}
      className={`group block ${sizeClasses[pin.size]}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        className={`relative w-full overflow-hidden bg-rule/40 ${aspect ? "" : aspectFor[pin.size]}`}
        style={aspect ? { aspectRatio: aspect } : undefined}
      >
        {pin.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pin.image_url}
            alt={pin.title ?? ""}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-faint">
            <span className="eyebrow">No image</span>
          </div>
        )}

        {hasVideo && (
          <video
            ref={videoRef}
            src={pin.video_url!}
            poster={pin.image_url ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          />
        )}

        {sourceUrl && (
          <button
            type="button"
            onClick={openSource}
            aria-label="Open source URL"
            title="Open original site"
            className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-ink text-paper text-base leading-none opacity-80 hover:opacity-100 transition-opacity shadow"
          >
            <span aria-hidden>↗</span>
          </button>
        )}
      </div>

      <div className="pt-4">
        <div className="eyebrow">{formatPinDate(pin.created_at)}</div>
        <div className="eyebrow mt-0.5">
          {pin.category?.name?.toUpperCase() ?? "UNCATEGORIZED"}
        </div>
        {pin.title && (
          <div className="pin-title mt-3 line-clamp-2 group-hover:underline underline-offset-4 decoration-1">
            {pin.title}
          </div>
        )}
        {pin.tags.length > 0 && (
          <div className="mt-1 text-[12.5px] text-ink-muted">
            {pin.tags.map((t) => t.name).join(" · ")}
          </div>
        )}
      </div>
    </Link>
  );
}
