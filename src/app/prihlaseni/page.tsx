import { redirect } from "next/navigation";
import { StarMark } from "@/components/brand";
import { Snow } from "@/components/snow";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "./auth-form";

export const metadata = { title: "Přihlášení · Tajný Ježíšek" };

const STEPS = ["Sepiš svůj seznam přání", "Počkej, až správce skupinu rozlosuje", "Vyber dárek z přání svého člověka"];

export default async function LoginPage({ searchParams }: PageProps<"/prihlaseni">) {
  const { chyba } = await searchParams;

  // Přihlášený člen skupiny sem nepatří.
  if (chyba !== "mimo-skupinu") {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) {
      const { data: member } = await supabase.from("participants").select("id").maybeSingle();
      if (member) redirect("/");
    }
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-pine-900 px-3 pt-5 pb-25 sm:items-center sm:px-4 sm:pt-12 sm:pb-30">
      <Snow count={42} seed={1} />
      <svg
        aria-hidden="true"
        viewBox="0 0 1200 140"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 block h-35 w-full"
      >
        <g fill="#163B2D">
          <polygon points="40,140 90,30 140,140" />
          <polygon points="120,140 160,60 200,140" />
          <polygon points="300,140 350,20 400,140" />
          <polygon points="380,140 415,70 450,140" />
          <polygon points="760,140 810,40 860,140" />
          <polygon points="850,140 885,80 920,140" />
          <polygon points="1010,140 1060,25 1110,140" />
          <polygon points="1090,140 1130,70 1170,140" />
        </g>
        <path d="M0 140 L0 112 Q300 92 600 110 T1200 104 L1200 140 Z" fill="#F7F1E5" opacity="0.92" />
      </svg>

      <div className="relative flex w-full max-w-[1000px] flex-wrap overflow-hidden rounded-[22px] bg-cream shadow-[0_30px_80px_rgba(0,0,0,.35)] sm:rounded-[28px]">
        <div className="relative flex flex-[1_1_380px] flex-col gap-5 overflow-hidden bg-pine-800 px-[22px] py-7 text-cream sm:gap-7 sm:px-11 sm:py-12">
          <div className="flex items-center gap-3">
            <StarMark className="size-[34px] text-gold" />
            <span className="font-heading text-2xl font-semibold">Tajný Ježíšek</span>
          </div>
          <div className="flex flex-col gap-3.5">
            <span className="text-[13px] font-bold tracking-[0.14em] text-gold-light uppercase">
              Vánoce {new Date().getFullYear()}
            </span>
            <h1 className="font-heading text-[32px] leading-[1.12] font-semibold sm:text-[44px] sm:leading-[1.08]">
              Kdo naděluje komu, ví jen Ježíšek.
            </h1>
            <p className="text-[17px] leading-relaxed text-cream/85">
              Napiš si, co by tě potěšilo, nech skupinu rozlosovat a obdaruj toho, koho ti los přidělí.
            </p>
          </div>
          <ol className="hidden flex-col gap-3.5 sm:flex">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-center gap-3.5">
                <span className="flex size-8 flex-none items-center justify-center rounded-full border border-gold font-bold text-gold-light">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-[1_1_380px] flex-col px-[22px] py-7 sm:px-11 sm:py-12">
          <AuthForm
            initialError={chyba === "mimo-skupinu" ? "Tenhle účet není ve skupině. Ozvi se správci." : undefined}
          />
        </div>
      </div>
    </div>
  );
}
