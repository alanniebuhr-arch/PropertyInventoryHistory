import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { sharedStyles, colors } from '../theme';

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary caught', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={[sharedStyles.screen, { padding: 24, justifyContent: 'center' }]}>
        <Text style={sharedStyles.title}>Something went wrong</Text>
        <Text style={[sharedStyles.subtitle, { marginBottom: 16 }]}>
          The app hit an unexpected error while starting. You can try again.
        </Text>
        <Text style={[sharedStyles.cardMeta, { marginBottom: 20, color: colors.danger }]}>
          {this.state.error.message}
        </Text>
        <Pressable
          onPress={this.handleReset}
          style={({ pressed }) => [sharedStyles.primaryBtn, pressed && sharedStyles.primaryBtnPressed]}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={sharedStyles.primaryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
