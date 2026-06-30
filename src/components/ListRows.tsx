import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { sharedStyles, colors } from '../theme';

export function PropertyListRow(props: {
  name: string;
  address?: string;
  thumbnailUri?: string;
  roomCount: number;
  itemCount: number;
  overdueCount: number;
  onPress: () => void;
}) {
  const { name, address, thumbnailUri, roomCount, itemCount, overdueCount, onPress } = props;
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
            {roomCount} room{roomCount === 1 ? '' : 's'} · {itemCount} item{itemCount === 1 ? '' : 's'}
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
          </Text>
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
  onPress: () => void;
}) {
  const { name, thumbnailUri, itemCount, overdueCount, onPress } = props;
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
          <Text style={sharedStyles.cardTitle}>{name}</Text>
          <Text style={sharedStyles.cardMeta}>
            {itemCount} item{itemCount === 1 ? '' : 's'}
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function ItemListRow(props: {
  label: string;
  typeLabel: string;
  thumbnailUri?: string;
  nextDueLabel?: string | null;
  lastServiceSummary?: string;
  overdue?: boolean;
  onPress: () => void;
}) {
  const { label, typeLabel, thumbnailUri, nextDueLabel, lastServiceSummary, overdue, onPress } = props;
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
          <Text style={sharedStyles.cardTitle}>{label}</Text>
          <Text style={sharedStyles.cardMeta}>{typeLabel}</Text>
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

export function EventListRow(props: {
  title: string;
  eventTypeLabel: string;
  dateLabel: string;
  costLabel?: string;
  recurrenceLabel?: string;
  photoCount?: number;
  onPress: () => void;
}) {
  const { title, eventTypeLabel, dateLabel, costLabel, recurrenceLabel, photoCount, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      <Text style={sharedStyles.cardTitle}>{title}</Text>
      <Text style={sharedStyles.cardMeta}>
        {eventTypeLabel} · {dateLabel}
        {costLabel ? ` · ${costLabel}` : ''}
        {photoCount != null && photoCount > 0 ? ` · ${photoCount} photo${photoCount === 1 ? '' : 's'}` : ''}
      </Text>
      {recurrenceLabel ? <Text style={sharedStyles.cardMeta}>{recurrenceLabel}</Text> : null}
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
