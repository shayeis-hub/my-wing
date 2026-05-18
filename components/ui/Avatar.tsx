interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ name, photoURL, size = 32, className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={style}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-wing-primary flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
      style={style}
    >
      {initials}
    </div>
  );
}
