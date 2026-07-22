import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { sharedStyles, colors } from '../theme';

export function PropertyListRow(props: {
  name: string;
  address?: string;
  thumbnailUri?: string;
  roomCount: number;
  itemCount: number;
  overdueCount: number;
  dueSoonCount: number;
  /** e.g. "within 3 months" — replaces the old fixed "this month" wording. */
  dueSoonPeriodLabel: string;
  onPress: () => void;
}) {
  const {
    name,
    address,
    thumbnailUri,
    roomCount,
    itemCount,
    overdueCount,
    dueSoonCount,
    dueSoonPeriodLabel,
    onPress,
  } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          marginBottom: 20,
          backgroundColor: 'transparent',
        },
        pressed && sharedStyles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={{
            width: '100%',
            aspectRatio: 16 / 10,
            borderRadius: 12,
            backgroundColor: colors.photoPlaceholder,
            marginBottom: 12,
          }}
        />
      ) : (
        <View
          style={{
            width: '100%',
            aspectRatio: 16 / 10,
            borderRadius: 12,
            backgroundColor: colors.photoPlaceholder,
            marginBottom: 12,
          }}
        />
      )}
      <Text style={[sharedStyles.cardTitle, { fontSize: 20 }]}>{name}</Text>
      {address ? <Text style={sharedStyles.cardMeta}>{address}</Text> : null}
      <Text style={sharedStyles.cardMeta}>
        {roomCount} room{roomCount === 1 ? '' : 's'} · {itemCount} asset
        {itemCount === 1 ? '' : 's'}
        {overdueCount > 0 ? (
          <Text style={{ color: colors.overdue, fontWeight: '600' }}>
            {` · ${overdueCount} overdue`}
          </Text>
        ) : null}
      </Text>
      {dueSoonCount > 0 ? (
        <Text style={[sharedStyles.cardMeta, { color: colors.dueSoon, fontWeight: '600' }]}>
          {dueSoonCount} service{dueSoonCount === 1 ? '' : 's'} due {dueSoonPeriodLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function RoomListRow(props: {
  name: string;
  thumbnailUri?: string;
  itemCount: number;
  overdueCount: number;
  upcomingCount?: number;
  requiresAuth?: boolean;
  onPress: () => void;
}) {
  const { name, thumbnailUri, itemCount, overdueCount, upcomingCount = 0, requiresAuth, onPress } =
    props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.hairline,
        },
        pressed && sharedStyles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: colors.photoPlaceholder,
          }}
        />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: colors.photoPlaceholder,
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={sharedStyles.cardTitle}>{name}</Text>
          {requiresAuth ? (
            <MaterialIcons name="lock" size={15} color={colors.textMuted} accessibilityLabel="Locked" />
          ) : null}
        </View>
        <Text style={sharedStyles.cardMeta}>
          {itemCount} asset{itemCount === 1 ? '' : 's'}
          {overdueCount > 0 ? (
            <Text style={{ color: colors.overdue, fontWeight: '600' }}>
              {` · ${overdueCount} overdue`}
            </Text>
          ) : null}
          {upcomingCount > 0 ? (
            <Text style={{ color: colors.dueSoon, fontWeight: '600' }}>
              {` · ${upcomingCount} upcoming`}
            </Text>
          ) : null}
        </Text>
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
  lastServiceDate?: string;
  lastServiceTitle?: string;
  lastServiceNotes?: string;
  overdue?: boolean;
  onPress: () => void;
}) {
  const {
    label,
    nameLabel,
    thumbnailUri,
    detailFields,
    nextDueLabel,
    lastServiceDate,
    lastServiceTitle,
    lastServiceNotes,
    overdue,
    onPress,
  } = props;
  const notesText = lastServiceNotes?.trim();
  const titleText = lastServiceTitle?.trim();
  const lastServiceLine = [titleText, notesText].filter(Boolean).join(' · ');
  const showLastServiceRow = Boolean(lastServiceDate || lastServiceLine);
  const showPhotoColumn = Boolean(thumbnailUri);
  const leftColWidth = ITEM_LIST_THUMB_SIZE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {showPhotoColumn ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={{
              width: leftColWidth,
              height: ITEM_LIST_THUMB_SIZE,
              borderRadius: 2,
              backgroundColor: colors.photoPlaceholder,
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
        </View>
      </View>

      {showLastServiceRow ? (
        <View style={{ marginTop: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <Text
              style={[
                sharedStyles.cardMeta,
                {
                  marginTop: 0,
                  width: showPhotoColumn || lastServiceDate ? leftColWidth : undefined,
                  textAlign: showPhotoColumn || lastServiceDate ? 'center' : 'left',
                  flexShrink: 0,
                  color: colors.lastService,
                },
              ]}
              numberOfLines={1}
            >
              {lastServiceDate ?? ''}
            </Text>
            {lastServiceLine ? (
              <Text
                style={[
                  sharedStyles.cardMeta,
                  { marginTop: 0, flex: 1, color: colors.lastService },
                ]}
                numberOfLines={3}
              >
                {lastServiceLine}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        </View>
      ) : null}

      {nextDueLabel ? (
        <Text
          style={[
            sharedStyles.cardMeta,
            showPhotoColumn || lastServiceDate
              ? { marginLeft: leftColWidth + 12 }
              : null,
            {
              color: overdue ? colors.overdue : colors.dueSoon,
              fontWeight: '600',
            },
          ]}
        >
          Next due: {nextDueLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

/** Photo-forward tile for property room gallery grids. */
export function RoomGalleryTile(props: {
  name: string;
  thumbnailUri?: string;
  itemCount: number;
  overdueCount: number;
  upcomingCount?: number;
  requiresAuth?: boolean;
  onPress: () => void;
}) {
  const {
    name,
    thumbnailUri,
    itemCount,
    overdueCount,
    upcomingCount = 0,
    requiresAuth,
    onPress,
  } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.galleryTile, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={sharedStyles.galleryImage} />
      ) : (
        <View style={sharedStyles.galleryImage} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 }}>
        <Text style={[sharedStyles.galleryCaption, { marginTop: 0, flex: 1 }]} numberOfLines={1}>
          {name}
        </Text>
        {requiresAuth ? (
          <MaterialIcons name="lock" size={14} color={colors.textMuted} accessibilityLabel="Locked" />
        ) : null}
      </View>
      <Text style={sharedStyles.galleryMeta} numberOfLines={2}>
        {itemCount} asset{itemCount === 1 ? '' : 's'}
        {overdueCount > 0 ? (
          <Text style={{ color: colors.overdue, fontWeight: '600' }}>
            {` · ${overdueCount} overdue`}
          </Text>
        ) : null}
        {upcomingCount > 0 ? (
          <Text style={{ color: colors.dueSoon, fontWeight: '600' }}>
            {` · ${upcomingCount} upcoming`}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

/** Photo-forward tile for room asset gallery grids. */
export function ItemGalleryTile(props: {
  label: string;
  nameLabel?: string;
  thumbnailUri?: string;
  nextDueLabel?: string | null;
  overdue?: boolean;
  onPress: () => void;
}) {
  const { label, nameLabel, thumbnailUri, nextDueLabel, overdue, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.galleryTile, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={sharedStyles.galleryImage} />
      ) : (
        <View style={sharedStyles.galleryImage} />
      )}
      <Text style={sharedStyles.galleryCaption} numberOfLines={1}>
        {label}
      </Text>
      {nameLabel ? (
        <Text style={sharedStyles.galleryMeta} numberOfLines={1}>
          {nameLabel}
        </Text>
      ) : null}
      {nextDueLabel ? (
        <Text
          style={[
            sharedStyles.galleryMeta,
            {
              color: overdue ? colors.overdue : colors.dueSoon,
              fontWeight: '600',
            },
          ]}
          numberOfLines={1}
        >
          {overdue ? 'Overdue' : 'Next due'}: {nextDueLabel}
        </Text>
      ) : null}
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
  /** When omitted, the row is read-only (not pressable). */
  onPress?: () => void;
}) {
  const { title, dateLabel, notes, thumbnailUri, onPress } = props;
  const notesText = notes?.trim();
  const body = (
    <View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: colors.text,
          marginBottom: thumbnailUri || notesText ? 8 : 0,
          letterSpacing: -0.1,
        }}
      >
        {dateLabel} · {title}
      </Text>
      {thumbnailUri || notesText ? (
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
            <Text style={[sharedStyles.cardMeta, { flex: 1 }]} numberOfLines={6}>
              {notesText}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return <View style={[sharedStyles.card, { backgroundColor: colors.historyCardBg }]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.card,
        { backgroundColor: colors.historyCardBg },
        pressed && sharedStyles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  );
}

export function VendorInteractionListRow(props: {
  methodLabel: string;
  dateLabel: string;
  contactName?: string;
  notes?: string;
  thumbnailUri?: string;
  onPress?: () => void;
}) {
  const { methodLabel, dateLabel, contactName, notes, thumbnailUri, onPress } = props;
  const notesText = notes?.trim();
  const contactText = contactName?.trim();
  const body = (
    <View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: colors.text,
          marginBottom: thumbnailUri || contactText || notesText ? 8 : 0,
          letterSpacing: -0.1,
        }}
      >
        {dateLabel} · {methodLabel}
      </Text>
      {thumbnailUri || contactText || notesText ? (
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
          <View style={{ flex: 1 }}>
            {contactText ? (
              <Text style={[sharedStyles.cardMeta, { marginTop: 0 }]} numberOfLines={1}>
                {contactText}
              </Text>
            ) : null}
            {notesText ? (
              <Text
                style={[
                  sharedStyles.cardMeta,
                  contactText ? { marginTop: 4 } : { marginTop: 0 },
                ]}
                numberOfLines={6}
              >
                {notesText}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  if (!onPress) {
    return <View style={[sharedStyles.card, { backgroundColor: colors.historyCardBg }]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.card,
        { backgroundColor: colors.historyCardBg },
        pressed && sharedStyles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      {body}
    </Pressable>
  );
}

export function OverdueBadge(props: { count: number }) {
  if (props.count <= 0) return null;
  return (
    <View
      style={{
        backgroundColor: colors.upcomingOverdueBg,
        borderRadius: 2,
        paddingHorizontal: 10,
        paddingVertical: 5,
        alignSelf: 'flex-start',
        marginBottom: 8,
      }}
    >
      <Text style={{ color: colors.overdue, fontWeight: '600', fontSize: 12, letterSpacing: 0.3 }}>
        {props.count} overdue maintenance
      </Text>
    </View>
  );
}

export function ProjectGalleryTile(props: {
  name: string;
  thumbnailUri?: string;
  vendorCount: number;
  waitingForQuoteCount?: number;
  onPress: () => void;
}) {
  const { name, thumbnailUri, vendorCount, waitingForQuoteCount = 0, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.galleryTile, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={sharedStyles.galleryImage} />
      ) : (
        <View style={sharedStyles.galleryImage} />
      )}
      <Text style={sharedStyles.galleryCaption} numberOfLines={1}>
        {name}
      </Text>
      <Text style={sharedStyles.galleryMeta} numberOfLines={2}>
        {vendorCount} vendor{vendorCount === 1 ? '' : 's'}
        {waitingForQuoteCount > 0 ? (
          <Text style={{ color: colors.dueSoon, fontWeight: '600' }}>
            {` · ${waitingForQuoteCount} waiting for quote`}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

export function ProjectListRow(props: {
  name: string;
  thumbnailUri?: string;
  vendorCount: number;
  waitingForQuoteCount?: number;
  onPress: () => void;
}) {
  const { name, thumbnailUri, vendorCount, waitingForQuoteCount = 0, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.hairline,
        },
        pressed && sharedStyles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image
          source={{ uri: thumbnailUri }}
          style={{
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: colors.photoPlaceholder,
          }}
        />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: colors.photoPlaceholder,
          }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={sharedStyles.cardTitle}>{name}</Text>
        <Text style={sharedStyles.cardMeta}>
          {vendorCount} vendor{vendorCount === 1 ? '' : 's'}
          {waitingForQuoteCount > 0 ? (
            <Text style={{ color: colors.dueSoon, fontWeight: '600' }}>
              {` · ${waitingForQuoteCount} waiting for quote`}
            </Text>
          ) : null}
        </Text>
      </View>
    </Pressable>
  );
}

export function VendorGalleryTile(props: {
  name: string;
  contactName?: string;
  statusLabel: string;
  statusColor: string;
  notesPreview?: string;
  thumbnailUri?: string;
  onPress: () => void;
}) {
  const { name, contactName, statusLabel, statusColor, notesPreview, thumbnailUri, onPress } = props;
  const notesText = notesPreview?.trim();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.galleryTile, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={sharedStyles.galleryImage} />
      ) : (
        <View style={sharedStyles.galleryImage} />
      )}
      <Text style={sharedStyles.galleryCaption} numberOfLines={1}>
        {name}
      </Text>
      {contactName ? (
        <Text style={sharedStyles.galleryMeta} numberOfLines={1}>
          {contactName}
        </Text>
      ) : null}
      <Text style={[sharedStyles.galleryMeta, { color: statusColor, fontWeight: '600' }]} numberOfLines={1}>
        {statusLabel}
      </Text>
      {notesText ? (
        <Text style={sharedStyles.galleryMeta} numberOfLines={3}>
          {notesText}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function VendorListRow(props: {
  name: string;
  contactName?: string;
  phone?: string;
  statusLabel: string;
  statusColor: string;
  notesPreview?: string;
  thumbnailUri?: string;
  lastInteractionDate?: string;
  lastInteractionTitle?: string;
  lastInteractionNotes?: string;
  lastInteractionPhotoUri?: string;
  onPress: () => void;
}) {
  const {
    name,
    contactName,
    phone,
    statusLabel,
    statusColor,
    notesPreview,
    thumbnailUri,
    lastInteractionDate,
    lastInteractionTitle,
    lastInteractionNotes,
    lastInteractionPhotoUri,
    onPress,
  } = props;
  const detailParts = [contactName, phone].filter(Boolean);
  const notesText = notesPreview?.trim();
  const interactionTitle = lastInteractionTitle?.trim();
  const interactionNotes = lastInteractionNotes?.trim();
  const lastInteractionLine = [interactionTitle, interactionNotes].filter(Boolean).join(' · ');
  const showLastInteractionRow = Boolean(lastInteractionDate || lastInteractionLine);
  const showPhotoColumn = Boolean(thumbnailUri);
  const leftColWidth = ITEM_LIST_THUMB_SIZE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [sharedStyles.card, pressed && sharedStyles.cardPressed]}
      accessibilityRole="button"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        {showPhotoColumn ? (
          <Image
            source={{ uri: thumbnailUri }}
            style={{
              width: leftColWidth,
              height: ITEM_LIST_THUMB_SIZE,
              borderRadius: 2,
              backgroundColor: colors.photoPlaceholder,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={sharedStyles.cardTitle}>{name}</Text>
          {detailParts.length > 0 ? (
            <Text style={sharedStyles.cardMeta} numberOfLines={2}>
              {detailParts.join(' · ')}
            </Text>
          ) : null}
          <Text style={[sharedStyles.cardMeta, { color: statusColor, fontWeight: '600', marginTop: 4 }]}>
            {statusLabel}
          </Text>
          {notesText ? (
            <Text style={[sharedStyles.cardMeta, { marginTop: 4 }]} numberOfLines={4}>
              {notesText}
            </Text>
          ) : null}
        </View>
      </View>

      {showLastInteractionRow ? (
        <View style={{ marginTop: 6 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <View
              style={{
                width: showPhotoColumn || lastInteractionDate ? leftColWidth : undefined,
                flexShrink: 0,
              }}
            >
              <Text
                style={[
                  sharedStyles.cardMeta,
                  {
                    marginTop: 0,
                    textAlign: showPhotoColumn || lastInteractionDate ? 'center' : 'left',
                    color: colors.lastService,
                  },
                ]}
                numberOfLines={1}
              >
                {lastInteractionDate ?? ''}
              </Text>
              {lastInteractionPhotoUri ? (
                <Image
                  source={{ uri: lastInteractionPhotoUri }}
                  style={{
                    width: leftColWidth,
                    height: ITEM_LIST_THUMB_SIZE,
                    borderRadius: 2,
                    backgroundColor: colors.photoPlaceholder,
                    marginTop: 4,
                  }}
                />
              ) : null}
            </View>
            {lastInteractionLine ? (
              <Text
                style={[
                  sharedStyles.cardMeta,
                  { marginTop: 0, flex: 1, color: colors.lastService },
                ]}
                numberOfLines={lastInteractionPhotoUri ? 6 : 3}
              >
                {lastInteractionLine}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}
