import { Redirect } from 'expo-router';

// The emotional healing topic list lives in the topics tab
export default function Redirect_() {
  return <Redirect href="/(tabs)/topics" />;
}
