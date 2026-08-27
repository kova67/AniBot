import Image from "next/image";

import { useSelectedAvatar } from "@/components/avatar/avatar-provider";
import { cn } from "@/lib/utils";

export function AniAvatar({
  active = false,
  className,
  reveal = false,
}: {
  active?: boolean;
  className?: string;
  reveal?: boolean;
}) {
  const { avatar } = useSelectedAvatar();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "ani-avatar relative block size-8 shrink-0 overflow-hidden rounded-[9px] bg-white/[0.11] p-px",
        active && "is-active",
        reveal && "is-reveal",
        className,
      )}
    >
      <span className="relative block size-full overflow-hidden rounded-[8px] bg-black">
        <Image
          alt=""
          className="object-cover"
          fill
          priority
          sizes="32px"
          src={avatar.thumbnail}
        />
      </span>
    </span>
  );
}
