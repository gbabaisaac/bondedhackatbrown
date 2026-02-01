import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAppTheme } from './theme';

export default function Index() {
  const router = useRouter();
  const theme = useAppTheme();

  useEffect(() => {
    // Redirect to welcome screen immediately
    router.replace('/welcome');
  }, []);

  // Show a minimal loading state while redirecting
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
      <ActivityIndicator size="large" color={theme.colors.bondedPurple} />
    </View>
  );
}

