import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

/**
 * Step control for a horizontal scroller on pointer devices.
 *
 * Drawn always rather than on hover: a control that only appears under the
 * cursor is invisible to keyboard users and to the touch half of a hybrid
 * laptop, which is most of the machines this runs on.
 */
export function CarouselArrow({
  direction,
  disabled = false,
  onPress,
}: {
  direction: 'previous' | 'next';
  disabled?: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Pressable
      accessibilityLabel={t(`common.${direction}`)}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={[
        'h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest active:scale-95',
        disabled ? 'opacity-30' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <MaterialIcons
        name={direction === 'previous' ? 'chevron-left' : 'chevron-right'}
        size={24}
        className="text-on-surface"
      />
    </Pressable>
  );
}
