import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

/**
 * Renders a ticket's QR payload. The white padding is required for scanners to
 * find the finder patterns regardless of the surrounding theme.
 */
export function TicketQr({ value, size = 200 }: { value: string; size?: number }) {
  return (
    <View className="items-center justify-center rounded-lg bg-white p-4">
      <QRCode value={value} size={size} />
    </View>
  );
}
