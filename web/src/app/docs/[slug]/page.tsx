import { notFound } from "next/navigation";
import { getDoc, getDocSlugs } from "@/lib/docs";
import { FlowArt, TiersArt, FlipArt, MarketArt } from "@/components/art";
import { Photo, type PhotoName } from "@/components/Photo";

export async function generateStaticParams() {
  return (await getDocSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<"/docs/[slug]">) {
  const { slug } = await props.params;
  const doc = await getDoc(slug);
  return {
    title: doc ? `${doc.title}, Precedent docs` : "Precedent docs",
    description: doc?.summary,
  };
}

/** Each doc opens with a photograph, then its diagram. */
const PHOTO: Record<string, { name: PhotoName; alt: string; caption: string }> = {
  overview: {
    name: "ledgers",
    alt: "Rows of bound ledger volumes on a shelf",
    caption: "A record that outlives any single transaction is what makes a market safe to trade in.",
  },
  "how-it-works": {
    name: "index-department",
    alt: "A card index department with clerks at rows of filing tables",
    caption: "The same job, done by hand: hire, observe, record, consult the record.",
  },
  usage: {
    name: "cabinets",
    alt: "Archive filing cabinets in rows",
    caption: "Everything below writes to, reads from, or reorganizes the record.",
  },
};

/** Each doc gets one illustration, placed under its intro. */
const ART: Record<string, { art: React.ReactNode; caption: string }> = {
  overview: {
    art: <MarketArt className="w-full" />,
    caption:
      "Every agent on the ACP marketplace. Each dot is one; the highlighted few are the 4.5% carrying any rating at all.",
  },
  "how-it-works": {
    art: <FlowArt className="w-full" />,
    caption:
      "Probe, record, remember, decide, and the outcome of today's job becomes evidence for tomorrow's.",
  },
  usage: {
    art: <FlipArt className="w-full" />,
    caption: "The same request, decided differently. The only variable is what was remembered.",
  },
};

export default async function DocPage(props: PageProps<"/docs/[slug]">) {
  const { slug } = await props.params;
  const doc = await getDoc(slug);
  if (!doc) notFound();

  const art = ART[slug];

  return (
    <article className="min-w-0">
      <header className="mb-8">
        <h1 className="font-display text-4xl tracking-tight">{doc.title}</h1>
        {doc.summary && <p className="mt-2 text-fg-muted">{doc.summary}</p>}
      </header>

      {PHOTO[slug] && PHOTO[slug].alt && (
        <div className="mb-8">
          <Photo
            name={PHOTO[slug].name}
            alt={PHOTO[slug].alt}
            caption={PHOTO[slug].caption}
            aspect="aspect-[21/8]"
          />
        </div>
      )}

      {art && (
        <figure className="glass mb-10 rounded-2xl p-6">
          <div className="relative">{art.art}</div>
          <figcaption className="relative mt-4 text-xs text-fg-faint">{art.caption}</figcaption>
        </figure>
      )}

      <div className="doc-prose" dangerouslySetInnerHTML={{ __html: doc.html }} />

      {slug === "overview" && (
        <figure className="glass mt-10 rounded-2xl p-6">
          <TiersArt className="w-full" />
          <figcaption className="relative mt-4 text-xs text-fg-faint">
            The five Sibyl Memory tiers, and what Precedent keeps in each.
          </figcaption>
        </figure>
      )}
    </article>
  );
}
