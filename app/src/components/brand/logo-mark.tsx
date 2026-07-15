import Svg, { Path, Rect } from 'react-native-svg';

type Props = { size ?: number; color?: string };

export function LogoMark({ size = 64, color = '#006b5f' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Rect
        x={52}
        y={52}
        width={408}
        height={408}
        rx={82}
        fill="none"
        stroke={color}
        strokeWidth={38}
        strokeLinejoin="round"
      />
      <Rect
        x={137}
        y={137}
        width={238}
        height={238}
        rx={50}
        fill="none"
        stroke={color}
        strokeWidth={34}
        strokeLinejoin="round"
      />
      <Path
        d="M1290 563V461H453Q466 335 544.0 272.0Q622 209 762 209Q875 209 993.5 242.5Q1112 276 1237 344V68Q1110 20 983.0 -4.5Q856 -29 729 -29Q425 -29 256.5 125.5Q88 280 88 559Q88 833 253.5 990.0Q419 1147 709 1147Q973 1147 1131.5 988.0Q1290 829 1290 563ZM922 682Q922 784 862.5 846.5Q803 909 707 909Q603 909 538.0 850.5Q473 792 457 682Z"
        fill={color}
        transform="translate(183.3503 317.9422) scale(0.105442 -0.105442)"
      />
    </Svg>
  );
}