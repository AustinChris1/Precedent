import Image from "next/image";
import credits from "../../public/img/credits.json";

/**
 * Photographs, treated.
 *
 * The source images are warm wood-and-brass archive interiors — the right
 * subject, the wrong colour for this palette. So they are desaturated and
 * re-tinted with the brand blue: the photograph keeps its texture and depth,
 * but belongs to the page instead of fighting it.
 *
 * All images are CC-licensed and require attribution, which `credits.json`
 * carries and <PhotoCredits /> renders.
 */

type Credit = {
  name: string;
  title: string;
  creator: string;
  creator_url: string;
  license: string;
  license_url: string;
  source: string;
};

const CREDITS = credits as Credit[];

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

