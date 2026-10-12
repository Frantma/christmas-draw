import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PersonAvatar({
  name,
  color,
  className,
  textClassName,
  title,
}: {
  name: string;
  color: string;
  className?: string;
  textClassName?: string;
  title?: string;
}) {
  return (
    <Avatar className={cn("after:hidden", className)} title={title}>
      <AvatarFallback className={cn("font-bold text-white", textClassName)} style={{ backgroundColor: color }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
