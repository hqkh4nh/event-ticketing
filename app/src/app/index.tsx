import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center gap-2">
        <Text className="text-2xl font-semibold text-slate-900">
          Event Ticketing
        </Text>
        <Text className="text-sm text-slate-500">
          App foundation is ready.
        </Text>
      </View>
    </SafeAreaView>
  );
}
