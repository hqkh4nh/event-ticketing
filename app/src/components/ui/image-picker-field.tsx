import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  uri?: string | null;
  variant: 'cover' | 'avatar';
  disabled?: boolean;
  loading?: boolean;
  fallbackText?: string;
  onPick: (asset: ImagePicker.ImagePickerAsset) => void;
  onRemove?: () => void;
};

export function ImagePickerField({
  uri,
  variant,
  disabled,
  loading,
  fallbackText,
  onPick,
  onRemove,
}: Props) {
  const { t } = useTranslation();
  const isAvatar = variant === 'avatar';
  const [pickerError, setPickerError] = useState(false);

  async function pickImage() {
    if (disabled || loading) return;
    setPickerError(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: isAvatar,
        ...(isAvatar ? { aspect: [1, 1] as [number, number] } : {}),
        quality: 0.85,
      });
      if (!result.canceled) onPick(result.assets[0]);
    } catch {
      setPickerError(true);
    }
  }

  return (
    <View className={isAvatar ? 'items-center gap-2' : 'gap-2'}>
      <View
        className={[
          'relative overflow-hidden border border-outline-variant',
          isAvatar ? 'h-24 w-24 rounded-full' : 'aspect-[16/9] w-full rounded-xl',
          isAvatar && !uri ? 'bg-primary-container' : 'bg-surface-container',
          disabled ? 'opacity-60' : '',
        ].join(' ')}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            uri ? 'media.changeImage' : 'media.chooseImage',
          )}
          disabled={disabled || loading}
          onPress={() => void pickImage()}
          className="h-full w-full items-center justify-center active:opacity-80"
        >
          {uri ? (
            <Image
              source={uri}
              recyclingKey={uri}
              contentFit="cover"
              style={StyleSheet.absoluteFillObject}
            />
          ) : fallbackText ? (
            <Text className="font-bold text-display-sm text-on-primary-container">
              {fallbackText}
            </Text>
          ) : null}
          <View
            className={[
              'items-center justify-center bg-black/60',
              isAvatar
                ? 'absolute bottom-0 left-0 right-0 h-8'
                : uri
                  ? 'absolute bottom-3 right-3 rounded-full p-3'
                  : 'rounded-full p-3',
            ].join(' ')}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <MaterialIcons
                name={uri ? 'photo-camera' : 'add-photo-alternate'}
                size={isAvatar ? 20 : 26}
                color="#FFFFFF"
              />
            )}
          </View>
        </Pressable>

        {uri && onRemove && !loading ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('media.removeImage')}
            disabled={disabled}
            onPress={onRemove}
            className="absolute right-2 top-2 h-10 w-10 items-center justify-center rounded-full bg-black/60 active:opacity-70"
          >
            <MaterialIcons name="delete-outline" size={21} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>
      <Text className="text-center font-sans text-label-sm text-on-surface-variant">
        {t(uri ? 'media.changeImage' : 'media.chooseImage')}
      </Text>
      {pickerError ? (
        <Text
          accessibilityRole="alert"
          className="text-center font-sans text-label-sm text-error"
        >
          {t('media.pickerError')}
        </Text>
      ) : null}
    </View>
  );
}
