interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: number;
  className?: string;
  isCurrentUser?: boolean;
  showYouBadge?: boolean;
}

export function Avatar({ name, photoURL, size = 32, className = "", isCurrentUser = false, showYouBadge = false }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const dim = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (photoURL) {
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoURL} alt={name} className={`rounded-full object-cover w-full h-full ${className}`} />
        {showYouBadge && size >= 28 && <YouBadge />}
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className={`rounded-full flex items-center justify-center font-bold w-full h-full ${className}`}
        style={{
          fontSize: dim.fontSize,
          ...(isCurrentUser
            ? { background: "linear-gradient(135deg, #f5dd4b, #ff6b47)", color: "#1a1814" }
            : { background: "#e8dcc8", color: "#1a1814" }),
        }}
      >
        {initials}
      </div>
      {showYouBadge && size >= 28 && <YouBadge />}
    </div>
  );
}

function YouBadge() {
  return (
    <span
      style={{
        position: "absolute",
        bottom: -2,
        right: -4,
        background: "#1a1814",
        color: "#fbf4e6",
        fontSize: 8,
        fontWeight: 800,
        padding: "1px 4px",
        borderRadius: 4,
        lineHeight: 1.4,
        letterSpacing: "0.04em",
        whiteSpace: "nowrap",
      }}
    >
      YOU
    </span>
  );
}
