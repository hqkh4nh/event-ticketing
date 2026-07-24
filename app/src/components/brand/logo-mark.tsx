import { Text } from 'react-native';
import Svg, { Circle, G, Mask, Path, Rect } from 'react-native-svg';

const CORAL = '#FF6B4A';
const INK = '#2A0F07';
const PERF = '#FFD9CE';

/** The lowercase `e`, traced from eticket-mark.svg. */
const E_PATH =
  'M296 -14Q222 -14 165.5 17.5Q109 49 77.5 106.5Q46 164 46 242V254Q46 332 77.0 389.5Q108 447 164.0 478.5Q220 510 294 510Q367 510 421.0 477.5Q475 445 505.0 387.5Q535 330 535 254V211H174Q176 160 212.0 128.0Q248 96 300 96Q353 96 378.0 119.0Q403 142 416 170L519 116Q505 90 478.5 59.5Q452 29 408.0 7.5Q364 -14 296 -14ZM175 305H407Q403 348 372.5 374.0Q342 400 293 400Q242 400 212.0 374.0Q182 348 175 305Z';

type Props = {
  size?: number;
  /**
   * Renders the whole mark as a single flat colour (the `e` and the perforation
   * dots are knocked out so the background shows through), for placements on a
   * coloured surface. Omit for the full-colour brand mark.
   */
  color?: string;
};

/**
 * The eTicket mark: a coral squircle holding a lowercase `e`, with a column of
 * perforation dots down the right edge that reads as a ticket. This is the one
 * mark used everywhere - splash, auth, headers - ported verbatim from
 * `app/assets/images/eticket-mark.svg` so web and native share a single identity.
 */
export function LogoMark({ size = 64, color }: Props) {
  if (color) {
    return (
      <Svg width={size} height={size} viewBox="0 0 512 512">
        <Mask id="knockout">
          <Rect x={0} y={0} width={512} height={512} rx={150} fill="#fff" />
          <G transform="translate(135.57,330.4) scale(0.3,-0.3)">
            <Path d={E_PATH} fill="#000" />
          </G>
          <Circle cx={380} cy={168} r={16} fill="#000" />
          <Circle cx={380} cy={256} r={16} fill="#000" />
          <Circle cx={380} cy={344} r={16} fill="#000" />
        </Mask>
        <Rect x={0} y={0} width={512} height={512} rx={150} fill={color} mask="url(#knockout)" />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512">
      <Rect x={0} y={0} width={512} height={512} rx={150} fill={CORAL} />
      <G transform="translate(135.57,330.4) scale(0.3,-0.3)" fill={INK}>
        <Path d={E_PATH} />
      </G>
      <Circle cx={380} cy={168} r={16} fill={PERF} />
      <Circle cx={380} cy={256} r={16} fill={PERF} />
      <Circle cx={380} cy={344} r={16} fill={PERF} />
    </Svg>
  );
}

/**
 * The eTicket wordmark: `eTicket` with a coral leading `e`. Sizing and weight
 * come from the caller's className (defaults to the display face at headline
 * size); this is the only place the wordmark is spelled out, so no screen
 * hardcodes the brand name.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <Text className={`font-display text-headline-md ${className ?? ''}`}>
      <Text className="text-primary">e</Text>
      <Text className="text-on-surface">Ticket</Text>
    </Text>
  );
}
