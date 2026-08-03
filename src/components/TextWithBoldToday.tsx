import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Text } from '../textScale';

const TODAY_MARKER = '(today)';

/** Inline nodes for use inside a parent `<Text>` — bolds every "(today)". */
export function boldTodayNodes(text: string): React.ReactNode {
  if (!text.includes(TODAY_MARKER)) return text;
  const parts = text.split(TODAY_MARKER);
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 ? (
        <Text style={{ fontWeight: '700' }}>{TODAY_MARKER}</Text>
      ) : null}
    </React.Fragment>
  ));
}

/** Standalone scaled Text that bolds "(today)" in its string content. */
export function TextWithBoldToday(props: {
  children: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { children, style, numberOfLines } = props;
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {boldTodayNodes(children)}
    </Text>
  );
}
