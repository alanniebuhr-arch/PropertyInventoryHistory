import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { sharedStyles, colors } from '../theme';

export function PropertyListRow(props: {
  name: string;
  address?: string;
  thumbnailUri?: string;
  roomCount: number;
  itemCount: number;
  dueSoonCount: number;
  onPress: () => void;
}) {
  const { name, address, thumbnailUri, roomCount, itemCount, dueSoonCount, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 8,
              backgroundColor: colors.border,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={sharedStyles.cardTitle}>{name}</Text>
          {address ? <Text style={sharedStyles.cardMeta}>{address}</Text> : null}
          <Text style={sharedStyles.cardMeta}>
            {roomCount} room{roomCount === 1 ? '' : 's'} · {itemCount} item
            {itemCount === 1 ? '' : 's'}
          </Text>
          {dueSoonCount > 0 ? (
            <Text style={[sharedStyles.cardMeta, { color: colors.overdue, fontWeight: '600' }]}>
              {dueSoonCount} service{dueSoonCount === 1 ? '' : 's'} due this month
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function RoomListRow(props: {
  name: string;
  thumbnailUri?: string;
  itemCount: number;
  overdueCount: number;
  requiresAuth?: boolean;
  onPress: () => void;
}) {
  const { name, thumbnailUri, itemCount, overdueCount, requiresAuth, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={{
              width: 48,
              height: 48,
              borderRadius: 8,
              backgroundColor: colors.border,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={sharedStyles.cardTitle}>{name}</Text>
            {requiresAuth ? (
              <MaterialIcons name="lock" size={16} color={colors.textMuted} accessibilityLabel="Locked" />
            ) : null}
          </View>
          <Text style={sharedStyles.cardMeta}>
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export const ITEM_LIST_THUMB_SIZE = 96;

export function ItemListRow(props: {
  label: string;
  nameLabel?: string;
  thumbnailUri?: string;
  detailFields?: { label: string; value: string }[];
  nextDueLabel?: string | null;
  lastServiceSummary?: string;
  overdue?: boolean;
  onPress: () => void;
}) {
  const {
    label,
    nameLabel,
    thumbnailUri,
    detailFields,
    nextDueLabel,
    lastServiceSummary,
    overdue,
    onPress,
  } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={{
              width: ITEM_LIST_THUMB_SIZE,
              height: ITEM_LIST_THUMB_SIZE,
              borderRadius: 8,
              backgroundColor: colors.border,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={sharedStyles.cardTitle}>{label}</Text>
          {nameLabel ? <Text style={sharedStyles.cardMeta}>{nameLabel}</Text> : null}
          {detailFields && detailFields.length > 0 ? (
            <Text style={sharedStyles.cardMeta} numberOfLines={4}>
              {detailFields.map((field) => field.value).join(', ')}
            </Text>
          ) : null}
          {lastServiceSummary ? (
            <Text style={sharedStyles.cardMeta} numberOfLines={2}>
              Last service: {lastServiceSummary}
            </Text>
          ) : null}
          {nextDueLabel ? (
            <Text style={[sharedStyles.cardMeta, overdue && { color: '#c62828', fontWeight: '600' }]}>
              Next due: {nextDueLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const EVENT_LIST_THUMB_SIZE = 72;

export function EventListRow(props: {
  title: string;
  eventTypeLabel: string;
  dateLabel: string;
  costLabel?: string;
  recurrenceLabel?: string;
  notes?: string;
  thumbnailUri?: string;
  photoCount?: number;
  onPress: () => void;
}) {
  const {
    title,
    eventTypeLabel,
    dateLabel,
    costLabel,
    recurrenceLabel,
    notes,
    thumbnailUri,
    photoCount,
    onPress,
  } = props;
  const notesText = notes?.trim();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {thumbnailUri ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={{
              width: EVENT_LIST_THUMB_SIZE,
              height: EVENT_LIST_THUMB_SIZE,
              borderRadius: 8,
              backgroundColor: colors.border,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={sharedStyles.cardTitle}>{title}</Text>
          <Text style={sharedStyles.cardMeta}>
            {eventTypeLabel} · {dateLabel}
            {costLabel ? ` · ${costLabel}` : ''}
            {photoCount != null && photoCount > 0 ? ` · ${photoCount} photo${photoCount === 1 ? '' : 's'}` : ''}
          </Text>
          {notesText ? (
            <Text style={[sharedStyles.cardMeta, { marginTop: 4 }]} numberOfLines={6}>
              {notesText}
            </Text>
          ) : null}
          {recurrenceLabel ? <Text style={sharedStyles.cardMeta}>{recurrenceLabel}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export function OverdueBadge(props: { count: number }) {
  if (props.count <= 0) return null;
  return (
    <View
      style={{
        backgroundColor: '#fdecea',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 8,
      }}
    >
      <Text style={{ color: '#c62828', fontWeight: '700', fontSize: 13 }}>
        {props.count} overdue maintenance
      </Text>
    </View>
  );
}
