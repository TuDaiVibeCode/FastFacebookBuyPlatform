import { StyleSheet, Text, View } from 'react-native';

export function OfflineBanner({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Showing stale cached data</Text>
      <Text style={styles.copy}>The API is unreachable. Pull to refresh after the connection returns.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    marginBottom: 12,
    padding: 12,
  },
  copy: {
    color: '#9a3412',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#7c2d12',
    fontSize: 14,
    fontWeight: '800',
  },
});
