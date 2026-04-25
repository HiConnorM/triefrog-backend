interface IconProps {
  name: string;
  size?: number;
  fill?: boolean;
  className?: string;
}

export function Icon({ name, size = 20, fill = false, className = '' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{
        fontSize: size,
        fontVariationSettings: fill ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300",
      }}
    >
      {name}
    </span>
  );
}
