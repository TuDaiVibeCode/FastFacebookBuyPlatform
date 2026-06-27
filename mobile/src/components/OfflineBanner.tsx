import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, Text, View } from 'react-native';

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <MaterialIcons name="cloud-off" size={18} color="#0842A0" />
      <Text style={styles.text}>Offline. Showing latest saved deals.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  text: {
    color: '#0842A0',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
