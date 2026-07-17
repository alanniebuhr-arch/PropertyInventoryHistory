import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ItemEvent } from '../types';
import { sharedStyles, colors } from '../theme';
import { formatDate } from '../utils';
import {
  daysOverdue,
  isOverdue,
  recurrenceIntervalLabel,
  upcomingDueAtISO,
  upcomingUrgency,
} from '../eventRecurrence';

const NOTES_DISPLAY_MAX = 80;

function urgencyBackground(dueAt: string | undefined): string | undefined {
  switch (upcomingUrgency(dueAt)) {
    case 'overdue':
      return colors.upcomingOverdueBg;
    case 'week':
      return colors.upcomingWeekBg;
    case 'month':
      return colors.upcomingMonthBg;
    default:
      return undefined;
  }
}

function truncateNotes(notes: string | undefined): string | undefined {
  const trimmed = notes?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= NOTES_DISPLAY_MAX) return trimmed;
  return `${trimmed.slice(0, NOTES_DISPLAY_MAX).trimEnd()}…`;
}

export function UpcomingServiceCard(props: {
  event: ItemEvent;
  /** Shown first on the title row when set (e.g. room or item name). */
  leadingLabel?: string;
  onPressDetails: () => void;
  onLogService: () => void;
}) {
  const { event, leadingLabel, onPressDetails, onLogService } = props;
  const dueAt = upcomingDueAtISO(event);
  const hasScheduledNextDue = Boolean(event.recurrence?.nextDueAtISO);
  const dueOverdue = isOverdue(dueAt);
  const daysLate = daysOverdue(dueAt);
  const bg = urgencyBackground(dueAt);
  const intervalText =
    hasScheduledNextDue && event.recurrence
      ? recurrenceIntervalLabel(event.recurrence.interval, event.recurrence.intervalMonths)
      : undefined;
  const titleText = leadingLabel?.trim()
    ? `${leadingLabel.trim()} · ${event.title}`
    : event.title;
  const notesText = truncateNotes(event.recurrence?.notes ?? event.notes);
  // Active reminders: open Log flow so previous occurrences stay in history.
  const onOpen = hasScheduledNextDue ? onLogService : onPressDetails;

  return (
    <View
      style={[
        sharedStyles.card,
        {
          marginBottom: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          ...(bg ? { backgroundColor: bg } : null),
          ...(dueOverdue
            ? { borderWidth: 2, borderColor: colors.overdue }
            : null),
        },
      ]}
    >
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={
          hasScheduledNextDue
            ? dueOverdue
              ? `Overdue: log service for ${titleText}`
              : `Log service for ${titleText}`
            : `Edit ${titleText}`
        }
        style={{ flex: 1 }}
      >
        {dueOverdue ? (
          <Text
            style={{
              color: colors.overdue,
              fontWeight: '800',
              fontSize: 12,
              letterSpacing: 0.6,
              marginBottom: 2,
            }}
          >
            OVERDUE
          </Text>
        ) : null}
        <Text style={sharedStyles.cardTitle}>{titleText}</Text>
        <Text
          style={[
            sharedStyles.cardMeta,
            dueOverdue && { color: colors.overdue, fontWeight: '700' },
          ]}
        >
          Due {dueAt ? formatDate(dueAt) : '—'}
          {dueOverdue && daysLate > 0
            ? ` · ${daysLate} day${daysLate === 1 ? '' : 's'} late`
            : ''}
          {!dueOverdue && intervalText ? ` · ${intervalText}` : ''}
        </Text>
        {dueOverdue && intervalText ? (
          <Text style={[sharedStyles.cardMeta, { color: colors.overdue }]}>{intervalText}</Text>
        ) : null}
        {notesText ? <Text style={sharedStyles.cardMeta}>{notesText}</Text> : null}
      </Pressable>
      {hasScheduledNextDue ? (
        <Pressable
          onPress={onLogService}
          style={({ pressed }) => ({
            paddingVertical: 8,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: dueOverdue ? colors.overdue : colors.primary,
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={`Log service for ${event.title}`}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            Log{'\n'}service
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
