import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, DevSettings, ScrollView } from 'react-native';
import { colors } from '../theme/colors';
import { fontFamilies } from '../theme/fonts';

interface Props { children: React.ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    if (__DEV__ && DevSettings?.reload) {
      DevSettings.reload();
    } else {
      // In production builds we rely on the user reopening the app — the
      // state reset above clears the error view in the meantime.
    }
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Something went{'\n'}<Text style={styles.titleItalic}>off-balance.</Text></Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Reloading usually clears it.
          </Text>
          <Text style={styles.detail}>{this.state.error.message}</Text>
          <TouchableOpacity onPress={this.handleReload} style={styles.btn} activeOpacity={0.85}>
            <Text style={styles.btnText}>Reload MANAS</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.cream },
  scroll: { padding: 28, paddingTop: 90 },
  title: { fontFamily: fontFamilies.frauncesMedium, fontSize: 28, color: colors.ink, lineHeight: 32, letterSpacing: -0.4 },
  titleItalic: { fontFamily: fontFamilies.frauncesItalic, color: colors.pink },
  body: { fontFamily: fontFamilies.fraunces, fontSize: 14, color: colors.inkSoft, marginTop: 12, lineHeight: 20 },
  detail: { fontFamily: fontFamilies.dmSans, fontSize: 11, color: colors.muted, marginTop: 18 },
  btn: { marginTop: 26, backgroundColor: colors.ink, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnText: { fontFamily: fontFamilies.dmSansMedium, fontSize: 13, color: colors.cream },
});
