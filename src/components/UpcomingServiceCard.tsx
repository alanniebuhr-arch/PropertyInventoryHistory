import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ItemEvent } from '../types';
import { sharedStyles, colors } from '../theme';
import { formatDate } from '../utils';
import { daysOverdue, isOverdue, upcomingDueAtISO } from '../eventRecurrence';
import { EVENT_LIST_THUMB_SIZE } from './ListRows';

export function UpcomingServiceCard(props: {
  event: ItemEvent;
  /** Shown first on the title row when set (e.g. room or asset name). */
  leadingLabel?: string;
  thumbnailUri?: string;
  onPressDetails: () => void;
  /** @deprecated Prefer editing the event; kept for call-site compatibility. */
  onLogService?: () => void;
}) {
  const { event, leadingLabel, thumbnailUri, onPressDetails } = props;
  const dueAt = upcomingDueAtISO(event);
  const dueOverdue = isOverdue(dueAt);
  const daysLate = daysOverdue(dueAt);
  const titleText = leadingLabel?.trim()
    ? `${leadingLabel.trim()} · ${event.title}`
    : event.title;
  const dateLabel = dueAt ? formatDate(dueAt) : '—';
  const notesText = (event.recurrence?.notes ?? event.notes)?.trim();
  const lateSuffix =
    dueOverdue && daysLate > 0
      ? ` · ${daysLate} day${daysLate === 1 ? '' : 's'} late`
      : '';
  const hasSecondary = Boolean(thumbnailUri || notesText);

  return (
    <Pressable
      onPress={onPressDetails}
      accessibilityRole="button"
      accessibilityLabel={
        dueOverdue ? `Overdue scheduled service: ${titleText}` : `Edit scheduled service: ${titleText}`
      }
      style={({ pressed }) => [
        sharedStyles.card,
        {
          marginBottom: 10,
          backgroundColor: dueOverdue ? colors.upcomingOverdueBg : colors.upcomingCardBg,
          borderColor: dueOverdue ? colors.overdue : colors.hairline,
          borderWidth: dueOverdue ? 1 : StyleSheet.hairlineWidth,
        },
        pressed && sharedStyles.cardPressed,
      ]}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '500',
          letterSpacing: 0.2,
          color: dueOverdue ? colors.overdue : colors.text,
          marginBottom: hasSecondary ? 8 : 0,
        }}
      >
        {dueOverdue ? 'OVERDUE · ' : ''}
        {dateLabel}
        {lateSuffix} · {titleText}
      </Text>
      {hasSecondary ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={{
                width: EVENT_LIST_THUMB_SIZE,
                height: EVENT_LIST_THUMB_SIZE,
                borderRadius: 2,
                backgroundColor: colors.photoPlaceholder,
              }}
            />
          ) : null}
          {notesText ? (
            <Text
              style={[
                sharedStyles.cardMeta,
                { flex: 1 },
                dueOverdue && { color: colors.overdue },
              ]}
              numberOfLines={6}
            >
              {notesText}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
