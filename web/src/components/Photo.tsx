import Image from "next/image";

/** Photographs, treated. */

export type PhotoName = "catalog-depth" | "index-department" | "cabinets" | "ledgers";

export function Photo({
  name,
  alt,
  caption,
  aspect = "aspect-[16/7]",
  priority = false,
  className = "",
}: {
  name: PhotoName;
  alt: string;
  caption?: string;
  aspect?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <figure className={`glass overflow-hidden rounded-2xl ${className}`}>
      <div className={`relative ${aspect} w-full`}>
        <Image
          src={`/img/${name}.jpg`}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 900px"
          priority={priority}
          className="object-cover [filter:grayscale(1)_contrast(1.06)_brightness(1.02)]"
        />
        {/* duotone: blue takes the hue, charcoal deepens one corner */}
        <div
          className="absolute inset-0 mix-blend-color"
          style={{ background: "var(--brand)", opacity: 0.72 }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, rgba(43,45,51,0.42) 0%, rgba(43,45,51,0.05) 55%, rgba(88,120,200,0.18) 100%)",
          }}
          aria-hidden
        />
      </div>
      {caption && (
        <figcaption className="relative px-5 py-3.5 text-xs leading-relaxed text-fg-faint">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

