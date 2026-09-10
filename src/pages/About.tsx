import { useEffect } from "react";
import { Link } from "wouter";
import { TramFront } from "lucide-react";

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "TransitAlert",
  url: "https://transit-alert.com",
  applicationCategory: "TravelApplication",
  operatingSystem: "Any (web browser)",
  description:
    "TransitAlert is a free, independent public transit tracking web app for Melbourne, Australia. It gives commuters live tracking of buses, trams and trains using real-time GTFS transit data, along with bus bay locations and stop information.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "AUD",
  },
  author: {
    "@type": "Person",
    name: "Tyler Noble-day",
  },
  areaServed: {
    "@type": "City",
    name: "Melbourne",
  },
};

const FAQS = [
  {
    question: "What is transit-alert.com?",
    answer:
      "transit-alert.com is the home of TransitAlert, a Melbourne public transit tracking web app that shows live bus, tram, and train locations using GTFS real-time data.",
  },
  {
    question: "Is TransitAlert official or affiliated with PTV?",
    answer:
      "No. TransitAlert is an independent, unofficial project built by a solo developer and is not affiliated with, endorsed by, or operated by Public Transport Victoria or any government body.",
  },
  {
    question: "Is TransitAlert free to use?",
    answer: "Yes, TransitAlert is free to use.",
  },
];

const FAQ_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function About() {
  useEffect(() => {
    document.title = "About TransitAlert — Live Melbourne Public Transit Tracking";
  }, []);

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-background px-4 py-10 text-white sm:px-6">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(15,23,42,0.95),_rgba(2,6,23,1)_60%)]" />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_STRUCTURED_DATA) }}
      />

      <div className="mx-auto max-w-2xl">
        <Link href="/app" className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300/80 hover:text-blue-200">
          ← Back to the live map
        </Link>

        <div className="mt-4 flex items-center gap-2.5">
          <TramFront className="h-7 w-7 text-blue-300" />
          <h1 className="text-2xl font-semibold text-white sm:text-3xl">About TransitAlert</h1>
        </div>

        <p className="mt-5 text-base leading-7 text-white/75">
          TransitAlert is a free, independent public transit tracking web app for Melbourne,
          Australia. It gives commuters live tracking of buses, trams and trains using real-time
          GTFS transit data, along with bus bay locations and stop information — all in one
          lightweight, easy-to-use site.
        </p>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">What TransitAlert does</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-white/70">
            <li>
              <strong className="text-white/90">Live vehicle tracking</strong> — see where buses,
              trams and trains actually are on their routes, not just scheduled times.
            </li>
            <li>
              <strong className="text-white/90">GTFS-powered data</strong> — built on the same
              open transit data standard used by transport authorities worldwide, kept up to date
              automatically.
            </li>
            <li>
              <strong className="text-white/90">Bus bay markers</strong> — know exactly which bay
              or platform to head to, especially useful at larger interchanges.
            </li>
            <li>
              <strong className="text-white/90">No app install required</strong> — TransitAlert
              runs entirely in the browser at transit-alert.com.
            </li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Who built it</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            TransitAlert is developed and maintained by Tyler Noble-day, a developer and digital
            artist, as an independent project — it is not affiliated with Public Transport
            Victoria (PTV) or any government transit authority. The source code is open on{" "}
            <a
              href="https://github.com/tylerbnobleday-cmyk/transit-alert"
              target="_blank"
              rel="noreferrer"
              className="text-blue-300 underline underline-offset-2 hover:text-blue-200"
            >
              GitHub
            </a>
            .
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Frequently asked questions</h2>
          <div className="mt-3 space-y-5">
            {FAQS.map((faq) => (
              <div key={faq.question}>
                <p className="text-sm font-semibold text-white/90">{faq.question}</p>
                <p className="mt-1 text-sm leading-6 text-white/70">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 border-t border-white/10 pt-6">
          <Link
            href="/app"
            className="inline-flex items-center rounded-[1.15rem] bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 sm:rounded-2xl"
          >
            Open the live map
          </Link>
        </div>
      </div>
    </main>
  );
}
