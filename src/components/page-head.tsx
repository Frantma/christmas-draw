import { Eyebrow } from "@/components/brand";

export function PageHead({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex max-w-[680px] flex-col gap-2">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="font-heading text-[32px] leading-[1.12] font-semibold sm:text-[42px] sm:leading-[1.1]">{title}</h1>
      <p className="text-[17px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
