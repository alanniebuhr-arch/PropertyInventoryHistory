import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ItemEvent } from '../types';
import { sharedStyles, colors } from '../theme';
import { formatDisplayDate, formatDisplayDateParts } from '../utils';
import { isOverdue, upcomingDueAtISO } from '../eventRecurrence';
import { EVENT_LIST_THUMB_SIZE } from './ListRows';
import { boldTodayNodes } from './TextWithBoldToday';
import { Text } from '../textScale';

/** Shared card for Reminders (service events and dated to-dos). */
export function UpcomingReminderCard(props: {
  title: string;
  dueAtISO?: string;
  notes?: string;
  thumbnailUri?: string;
  onPress: () => void;
  /** Used in accessibility labels, e.g. "service" or "to-do". */
  noun?: string;
  important?: boolean;
  /** Property or project name when the card is shown in a mixed-scope list. */
  scopeLabel?: string;
  /** Non-overdue card fill; defaults to upcomingCardBg. */
  cardBackgroundColor?: string;
  /** When set, draw a list divider under the row (Property section style). */
  dividerColor?: string;
  /** Optional type glyph in the top-right (e.g. handyman / forum / checklist). */
  cornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  const {
    title,
    dueAtISO,
    notes,
    thumbnailUri,
    onPress,
    noun = 'reminder',
    important,
    scopeLabel,
    cardBackgroundColor,
    dividerColor,
    cornerIcon,
  } = props;
  const dueOverdue = isOverdue(dueAtISO);
  const dateParts = dueAtISO ? formatDisplayDateParts(dueAtISO) : null;
  const dateLabel = dueAtISO ? formatDisplayDate(dueAtISO) : '—';
  const notesText = notes?.trim();
  const hasSecondary = Boolean(thumbnailUri || notesText);
  const interactionDateAccent = noun === 'interaction' && !dueOverdue && Boolean(dateParts);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        dueOverdue
          ? `Overdue ${noun}: ${title}`
          : important
            ? `Important ${noun}: ${title}`
            : `Open ${noun}: ${title}`
      }
      style={({ pressed }) => [
        sharedStyles.card,
        {
          marginBottom: dividerColor ? 0 : 10,
          backgroundColor: dueOverdue
            ? colors.upcomingOverdueBg
            : (cardBackgroundColor ?? colors.upcomingCardBg),
          ...(dividerColor
            ? {
                borderRadius: 0,
                borderWidth: 0,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: dividerColor,
              }
            : {
                borderColor: dueOverdue ? colors.overdue : colors.hairline,
                borderWidth: dueOverdue ? 1 : StyleSheet.hairlineWidth,
              }),
        },
        pressed && sharedStyles.cardPressed,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {important ? (
            <MaterialIcons name="star" size={16} color={colors.primary} accessibilityLabel="Important" />
          ) : null}
          <Text
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: important ? '700' : '500',
              letterSpacing: 0.2,
              color: dueOverdue ? colors.overdue : colors.text,
            }}
          >
            {dueOverdue ? 'OVERDUE · ' : ''}
            {interactionDateAccent && dateParts ? (
              <>
                <Text style={{ fontWeight: '700', color: colors.interactionDate }}>{dateParts.date}</Text>
                {dateParts.rest ? (
                  <Text style={{ fontWeight: '500', color: colors.textMuted }}>
                    {' '}
                    {boldTodayNodes(dateParts.rest)}
                  </Text>
                ) : null}
              </>
            ) : (
              boldTodayNodes(dateLabel)
            )}
          </Text>
        </View>
        {cornerIcon ? (
          <MaterialIcons name={cornerIcon} size={22} color={colors.primary} />
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          letterSpacing: 0.2,
          color: dueOverdue ? colors.overdue : colors.text,
          marginTop: 2,
        }}
      >
        {title}
      </Text>
      {scopeLabel ? (
        <Text
          style={[
            sharedStyles.cardMeta,
            { marginTop: 2 },
            dueOverdue && { color: colors.overdue },
          ]}
          numberOfLines={1}
        >
          {scopeLabel}
        </Text>
      ) : null}
      {hasSecondary ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
            marginTop: 4,
          }}
        >
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
                { flex: 1, marginTop: 0 },
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

export function UpcomingServiceCard(props: {
  event: ItemEvent;
  /** Shown first on the title row when set (e.g. room or asset name). */
  leadingLabel?: string;
  thumbnailUri?: string;
  onPressDetails: () => void;
  /** @deprecated Prefer editing the event; kept for call-site compatibility. */
  onLogService?: () => void;
  cardBackgroundColor?: string;
  dividerColor?: string;
  cornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  const {
    event,
    leadingLabel,
    thumbnailUri,
    onPressDetails,
    cardBackgroundColor,
    dividerColor,
    cornerIcon,
  } = props;
  const dueAt = upcomingDueAtISO(event);
  const titleText = leadingLabel?.trim()
    ? `${leadingLabel.trim()} · ${event.title}`
    : event.title;
  const notesText = (event.recurrence?.notes ?? event.notes)?.trim();

  return (
    <UpcomingReminderCard
      title={titleText}
      dueAtISO={dueAt}
      notes={notesText}
      thumbnailUri={thumbnailUri}
      onPress={onPressDetails}
      noun="scheduled service"
      cardBackgroundColor={cardBackgroundColor}
      dividerColor={dividerColor}
      cornerIcon={cornerIcon}
    />
  );
}
