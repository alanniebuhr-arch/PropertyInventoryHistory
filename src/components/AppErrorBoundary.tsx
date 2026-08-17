import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../textScale';
import { sharedStyles, colors } from '../theme';

type Props = {
  children: ReactNode;
  onReset?: () => void;
};

type State = {
  error: Error | null;
  stack: string | null;
};

/**
 * Do not reset error state from getDerivedStateFromProps. Clearing the error
 * on the same update that getDerivedStateFromError sets it causes an infinite
 * throw/reset loop and Expo Go is killed (the app “just goes away”).
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, stack: error.stack ?? null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('AppErrorBoundary caught', error, info.componentStack);
    this.setState({ stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}` });
  }

  private handleReset = () => {
    this.setState({ error: null, stack: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={[sharedStyles.screen, { padding: 24, justifyContent: 'center' }]}>
        <Text style={sharedStyles.title}>Something went wrong</Text>
        <Text style={[sharedStyles.subtitle, { marginBottom: 16 }]}>
          The app hit an unexpected error. You can try again.
        </Text>
        <Text style={[sharedStyles.cardMeta, { marginBottom: 12, color: colors.danger }]}>
          {this.state.error.message}
        </Text>
        {this.state.stack ? (
          <Text style={[sharedStyles.cardMeta, { marginBottom: 20 }]} selectable>
            {this.state.stack.slice(0, 1200)}
          </Text>
        ) : null}
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
