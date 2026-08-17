import React from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { sharedStyles, colors } from '../theme';
import { Text } from '../textScale';
import { splitHighlightParts } from '../searchSnippet';
import { formatDisplayDateParts, formatPhoneNumber } from '../utils';
import { boldTodayNodes } from './TextWithBoldToday';

/** Calendar date accented; weekday / relative age inherit (or use restStyle). */
export function InteractionDateText(props: {
  iso: string;
  style?: StyleProp<TextStyle>;
  /** Applied only to the DD/MM/YYYY (locale) portion. */
  dateStyle?: StyleProp<TextStyle>;
  /** Applied to weekday + (# days) when parent accent must not leak. */
  restStyle?: StyleProp<TextStyle>;
  /** When true, put relative `(# days…)` on its own bold line under date + weekday. */
  stackRelative?: boolean;
  /** Applied to the stacked relative line (defaults to bold). */
  relativeStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) {
  const { iso, style, dateStyle, restStyle, stackRelative, relativeStyle, numberOfLines } =
    props;
  const { date, rest, weekday, relative } = formatDisplayDateParts(iso);

  if (stackRelative && relative) {
    // Drop flex from line styles — flex on nested Text inside a column View
    // collapses the relative line so it never appears.
    const flat = StyleSheet.flatten(style) ?? {};
    const { flex: _flex, alignSelf: _alignSelf, ...lineStyle } = flat as TextStyle & {
      flex?: number;
      alignSelf?: TextStyle['alignSelf'];
    };
    return (
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={lineStyle} numberOfLines={numberOfLines}>
          <Text style={[{ fontWeight: '700', color: colors.interactionDate }, dateStyle]}>
            {date}
          </Text>
          {weekday ? (
            restStyle ? (
              <Text style={restStyle}>
                {' '}
                {weekday}
              </Text>
            ) : (
              <> {weekday}</>
            )
          ) : null}
        </Text>
        <Text style={[lineStyle, { fontWeight: '700', marginTop: 2 }, relativeStyle]} numberOfLines={1}>
          {relative}
        </Text>
      </View>
    );
  }

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      <Text style={[{ fontWeight: '700', color: colors.interactionDate }, dateStyle]}>{date}</Text>
      {rest ? (
        restStyle ? (
          <Text style={restStyle}>
            {' '}
            {boldTodayNodes(rest)}
          </Text>
        ) : (
          <>
            {' '}
            {boldTodayNodes(rest)}
          </>
        )
      ) : null}
    </Text>
  );
}

export function PropertyListRow(props: {
  name: string;
  address?: string;
  thumbnailUri?: string;
  projectCount: number;
  todoCount: number;
  overdueCount: number;
  reminderCount: number;
  /** e.g. "within 3 months" — replaces the old fixed "this month" wording. */
  dueSoonPeriodLabel: string;
  /** Alternate strip so house photo + title read as one pair. */
  striped?: boolean;
  remindersExpanded?: boolean;
  onToggleReminders?: () => void;
  onPress: () => void;
  children?: React.ReactNode;
}) {
  const {
    name,
    address,
    thumbnailUri,
    projectCount,
    todoCount,
    overdueCount,
    reminderCount,
    dueSoonPeriodLabel,
    striped,
    remindersExpanded,
    onToggleReminders,
    onPress,
    children,
  } = props;
  return (
    <View
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: 14,
        backgroundColor: striped ? colors.historyCardBg : colors.card,
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && sharedStyles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open property ${name}`}
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
          {projectCount} project{projectCount === 1 ? '' : 's'}
          {todoCount > 0
            ? ` · ${todoCount} to-do${todoCount === 1 ? '' : 's'}`
            : ''}
          {overdueCount > 0 ? (
            <Text style={{ color: colors.overdue, fontWeight: '600' }}>
              {` · ${overdueCount} overdue`}
            </Text>
          ) : null}
        </Text>
      </Pressable>
      {reminderCount > 0 ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginTop: 2,
          }}
        >
          <Text
            style={[sharedStyles.cardMeta, { color: colors.dueSoon, fontWeight: '600', flex: 1 }]}
          >
            {reminderCount} reminder{reminderCount === 1 ? '' : 's'} due {dueSoonPeriodLabel}
          </Text>
          {onToggleReminders ? (
            <Pressable
              onPress={onToggleReminders}
              accessibilityRole="button"
              accessibilityLabel={
                remindersExpanded
                  ? `Hide reminders for ${name}`
                  : `Show reminders for ${name}`
              }
              accessibilityState={{ expanded: remindersExpanded === true }}
              hitSlop={8}
              style={({ pressed }) => ({
                padding: 2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <MaterialIcons
                name={remindersExpanded ? 'expand-less' : 'expand-more'}
                size={24}
                color={colors.primary}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {remindersExpanded && children ? (
        <View style={{ marginTop: 8 }}>{children}</View>
      ) : null}
    </View>
  );
}

export function RoomListRow(props: {
  name: string;
  /** Property name shown under the title on Home and other cross-scope lists. */
  scopeLabel?: string;
  thumbnailUri?: string;
  itemCount: number;
  overdueCount: number;
  upcomingCount?: number;
  requiresAuth?: boolean;
  onPress: () => void;
  /** Divider under the row; defaults to hairline. */
  dividerColor?: string;
}) {
  const {
    name,
    scopeLabel,
    thumbnailUri,
    itemCount,
    overdueCount,
    upcomingCount = 0,
    requiresAuth,
    onPress,
    dividerColor,
  } = props;
  const scopeText = scopeLabel?.trim();
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
          borderBottomColor: dividerColor ?? colors.hairline,
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
        {scopeText ? (
          <Text style={sharedStyles.cardMeta} numberOfLines={1}>
            {scopeText}
          </Text>
        ) : null}
        <Text style={sharedStyles.cardMeta}>
          {itemCount} asset{itemCount === 1 ? '' : 's'}
          {overdueCount > 0 ? (
            <Text style={{ color: colors.overdue, fontWeight: '600', fontSize: 13 }}>
              {` · ${overdueCount} overdue`}
            </Text>
          ) : null}
          {upcomingCount > 0 ? (
            <Text style={{ color: colors.dueSoon, fontWeight: '600', fontSize: 13 }}>
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
  /** Property/room context shown under the title on cross-scope lists. */
  scopeLabel?: string;
  thumbnailUri?: string;
  detailFields?: { label: string; value: string }[];
  nextDueLabel?: string | null;
  lastServiceDate?: string;
  lastServiceTitle?: string;
  lastServiceNotes?: string;
  /** Formatted cost for the last service event, when present. */
  lastServiceCost?: string;
  overdue?: boolean;
  onPress: () => void;
  cardBackgroundColor?: string;
  /** When set, draw a list divider under the row (Property section style). */
  dividerColor?: string;
  /** Bottom divider thickness when `dividerColor` is set (default hairline). */
  dividerWidth?: number;
  /** Optional type glyph in the top-right of the card (e.g. inventory for assets). */
  cornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  const {
    label,
    nameLabel,
    scopeLabel,
    thumbnailUri,
    detailFields,
    nextDueLabel,
    lastServiceDate,
    lastServiceTitle,
    lastServiceNotes,
    lastServiceCost,
    overdue,
    onPress,
    cardBackgroundColor,
    dividerColor,
    dividerWidth,
    cornerIcon,
  } = props;
  const scopeText = scopeLabel?.trim();
  const notesText = lastServiceNotes?.trim();
  const titleText = lastServiceTitle?.trim();
  const costText = lastServiceCost?.trim();
  const lastServiceLine = [titleText, costText, notesText].filter(Boolean).join(' · ');
  const showLastServiceRow = Boolean(lastServiceDate || lastServiceLine);
  const showPhotoColumn = Boolean(thumbnailUri);
  const leftColWidth = ITEM_LIST_THUMB_SIZE;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.card,
        {
          backgroundColor: cardBackgroundColor ?? colors.card,
          ...(dividerColor
            ? {
                marginBottom: 0,
                borderRadius: 0,
                borderWidth: 0,
                borderBottomWidth: dividerWidth ?? StyleSheet.hairlineWidth,
                borderBottomColor: dividerColor,
              }
            : null),
        },
        pressed && sharedStyles.cardPressed,
      ]}
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
          {scopeText ? (
            <Text style={sharedStyles.cardMeta} numberOfLines={1}>
              {scopeText}
            </Text>
          ) : null}
          {nameLabel ? <Text style={sharedStyles.cardMeta}>{nameLabel}</Text> : null}
          {detailFields && detailFields.length > 0 ? (
            <Text style={sharedStyles.cardMeta} numberOfLines={4}>
              {detailFields.map((field) => field.value).join(', ')}
            </Text>
          ) : null}
        </View>
        {cornerIcon ? (
          <MaterialIcons name={cornerIcon} size={22} color={colors.primary} />
        ) : null}
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
              {boldTodayNodes(lastServiceDate ?? '')}
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
          Next due: {boldTodayNodes(nextDueLabel)}
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
        <Text
          style={[sharedStyles.galleryCaption, { marginTop: 0, flex: 1 }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {requiresAuth ? (
          <MaterialIcons name="lock" size={14} color={colors.textMuted} accessibilityLabel="Locked" />
        ) : null}
      </View>
      <Text style={sharedStyles.galleryMeta} numberOfLines={2}>
        {itemCount} asset{itemCount === 1 ? '' : 's'}
        {overdueCount > 0 ? (
          <Text style={{ color: colors.overdue, fontWeight: '600', fontSize: 12 }}>
            {` · ${overdueCount} overdue`}
          </Text>
        ) : null}
        {upcomingCount > 0 ? (
          <Text style={{ color: colors.dueSoon, fontWeight: '600', fontSize: 12 }}>
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
          {overdue ? 'Overdue' : 'Next due'}: {boldTodayNodes(nextDueLabel)}
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
  cardBackgroundColor?: string;
}) {
  const { title, dateLabel, costLabel, notes, thumbnailUri, onPress, cardBackgroundColor } =
    props;
  const rowBg = cardBackgroundColor ?? colors.historyCardBg;
  const notesText = notes?.trim();
  const costText = costLabel?.trim();
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
        {boldTodayNodes(dateLabel)}
        {title ? ` · ${title}` : ''}
        {costText ? ` · ${costText}` : ''}
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
    return <View style={[sharedStyles.card, { backgroundColor: rowBg }]}>{body}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.card,
        { backgroundColor: rowBg },
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
  dateISO: string;
  contactName?: string;
  notes?: string;
  thumbnailUri?: string;
  important?: boolean;
  onPress?: () => void;
}) {
  const { methodLabel, dateISO, contactName, notes, thumbnailUri, important, onPress } = props;
  const notesText = notes?.trim();
  const contactText = contactName?.trim();
  const body = (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginBottom: thumbnailUri || contactText || notesText ? 8 : 0,
        }}
      >
        {important ? (
          <MaterialIcons name="star" size={16} color={colors.primary} accessibilityLabel="Important" />
        ) : null}
        <Text
          style={{
            flex: 1,
            fontSize: 14,
            fontWeight: important ? '700' : '500',
            color: colors.text,
            letterSpacing: -0.1,
          }}
        >
          <InteractionDateText iso={dateISO} restStyle={{ fontWeight: '500', color: colors.text }} />
          {' · '}
          {methodLabel}
        </Text>
      </View>
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

export function PropertyTodoListRow(props: {
  title: string;
  dueLabel?: string;
  notes?: string;
  done: boolean;
  thumbnailUri?: string;
  onPress: () => void;
  /** 'idea' shows a lightbulb instead of a done checkbox. */
  variant?: 'todo' | 'idea';
  cardBackgroundColor?: string;
  /** When set, draw a list divider under the row (Property section style). */
  dividerColor?: string;
  /** Bottom divider thickness when `dividerColor` is set (default hairline). */
  dividerWidth?: number;
  /** Optional type glyph in the top-right of the card (e.g. notes for Search all). */
  cornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  const {
    title,
    dueLabel,
    notes,
    done,
    thumbnailUri,
    onPress,
    variant = 'todo',
    cardBackgroundColor,
    dividerColor,
    dividerWidth,
    cornerIcon,
  } = props;
  const isIdea = variant === 'idea';
  const notesText = notes?.trim();
  const dimmed = done && !isIdea;
  const titleColor = dimmed ? colors.textMuted : colors.text;
  const metaColor = dimmed ? colors.textMuted : colors.text;
  const leadingIcon = isIdea
    ? 'lightbulb-outline'
    : done
      ? 'check-box'
      : 'check-box-outline-blank';
  const leadingIconColor = isIdea
    ? colors.primary
    : done
      ? colors.primary
      : colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        sharedStyles.card,
        {
          backgroundColor: cardBackgroundColor ?? colors.historyCardBg,
          opacity: dimmed ? 0.75 : 1,
          ...(dividerColor
            ? {
                marginBottom: 0,
                borderRadius: 0,
                borderWidth: 0,
                borderBottomWidth: dividerWidth ?? StyleSheet.hairlineWidth,
                borderBottomColor: dividerColor,
              }
            : null),
        },
        pressed && sharedStyles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={isIdea ? undefined : { checked: done }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <MaterialIcons
          name={leadingIcon}
          size={22}
          color={leadingIconColor}
          style={{ marginTop: 1 }}
        />
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: dueLabel || thumbnailUri || notesText ? 6 : 0,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 15,
                fontWeight: '600',
                color: titleColor,
                textDecorationLine: dimmed ? 'line-through' : 'none',
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
            {cornerIcon ? (
              <MaterialIcons name={cornerIcon} size={22} color={colors.primary} />
            ) : null}
          </View>
          {dueLabel ? (
            <Text
              style={[sharedStyles.cardMeta, { marginTop: 0, color: metaColor, marginBottom: 6 }]}
              numberOfLines={1}
            >
              Due {boldTodayNodes(dueLabel)}
            </Text>
          ) : null}
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
                <Text
                  style={[sharedStyles.cardMeta, { marginTop: 0, flex: 1, color: metaColor }]}
                  numberOfLines={6}
                >
                  {notesText}
                </Text>
              ) : null}
            </View>
          ) : null}
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
  statusLabel?: string;
  statusColor?: string;
  totalCostLabel?: string;
  onPress: () => void;
}) {
  const {
    name,
    thumbnailUri,
    vendorCount,
    waitingForQuoteCount = 0,
    statusLabel,
    statusColor,
    totalCostLabel,
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
      <Text style={sharedStyles.galleryCaption} numberOfLines={1}>
        {name}
      </Text>
      {statusLabel ? (
        <Text
          style={[
            sharedStyles.galleryMeta,
            { color: statusColor ?? colors.primary, fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {statusLabel}
        </Text>
      ) : null}
      {totalCostLabel ? (
        <Text style={sharedStyles.galleryMeta} numberOfLines={1}>
          {totalCostLabel}
        </Text>
      ) : null}
      <Text style={sharedStyles.galleryMeta} numberOfLines={2}>
        {vendorCount} vendor{vendorCount === 1 ? '' : 's'}
        {waitingForQuoteCount > 0 ? (
          <Text
            style={{ color: colors.dueSoon, fontWeight: '600', fontSize: 12 }}
          >
            {` · ${waitingForQuoteCount} waiting for quote`}
          </Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

export function ProjectListRow(props: {
  name: string;
  /** Property name shown under the title on Home and other cross-scope lists. */
  scopeLabel?: string;
  thumbnailUri?: string;
  vendorCount: number;
  waitingForQuoteCount?: number;
  statusLabel?: string;
  statusColor?: string;
  totalCostLabel?: string;
  onPress: () => void;
  /** Divider under the row; defaults to hairline. */
  dividerColor?: string;
  /** Home-style card: full-width photo like Properties. */
  card?: boolean;
  striped?: boolean;
}) {
  const {
    name,
    scopeLabel,
    thumbnailUri,
    vendorCount,
    waitingForQuoteCount = 0,
    statusLabel,
    statusColor,
    totalCostLabel,
    onPress,
    dividerColor,
    card,
    striped,
  } = props;
  const scopeText = scopeLabel?.trim();
  const vendorLine = (
    <Text style={sharedStyles.cardMeta}>
      {vendorCount} vendor{vendorCount === 1 ? '' : 's'}
      {waitingForQuoteCount > 0 ? (
        <Text style={{ color: colors.dueSoon, fontWeight: '600', fontSize: 13 }}>
          {` · ${waitingForQuoteCount} waiting for quote`}
        </Text>
      ) : null}
    </Text>
  );
  const details = (
    <>
      {scopeText ? (
        <Text style={sharedStyles.cardMeta} numberOfLines={1}>
          {scopeText}
        </Text>
      ) : null}
      {statusLabel ? (
        <Text
          style={[
            sharedStyles.cardMeta,
            { color: statusColor ?? colors.primary, fontWeight: '600', marginTop: 2 },
          ]}
          numberOfLines={1}
        >
          {statusLabel}
        </Text>
      ) : null}
      {totalCostLabel ? (
        <Text style={sharedStyles.cardMeta} numberOfLines={1}>
          {totalCostLabel}
        </Text>
      ) : null}
      {vendorLine}
    </>
  );

  if (card) {
    return (
      <View
        style={{
          marginBottom: 12,
          padding: 12,
          borderRadius: 14,
          backgroundColor: striped ? colors.historyCardBg : colors.card,
        }}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [pressed && sharedStyles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Open project ${name}`}
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
          {details}
        </Pressable>
      </View>
    );
  }

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
          borderBottomColor: dividerColor ?? colors.hairline,
        },
        pressed && sharedStyles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Open project ${name}`}
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
        {details}
      </View>
    </Pressable>
  );
}

export function PinnedListRow(props: {
  title: string;
  kindLabel: string;
  scopeLabel?: string;
  thumbnailUri?: string;
  onPress: () => void;
}) {
  const { title, kindLabel, scopeLabel, thumbnailUri, onPress } = props;
  const scopeText = scopeLabel?.trim();
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
        <Text style={sharedStyles.cardTitle}>{title}</Text>
        {scopeText ? (
          <Text style={sharedStyles.cardMeta} numberOfLines={1}>
            {scopeText}
          </Text>
        ) : null}
        <Text style={[sharedStyles.cardMeta, { fontWeight: '600', color: colors.primary }]}>
          {kindLabel}
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
        <Image
          source={{ uri: thumbnailUri }}
          style={sharedStyles.galleryImage}
          resizeMode="contain"
        />
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
  /** Property/project context shown under the title on Home and other cross-scope lists. */
  scopeLabel?: string;
  contactName?: string;
  phone?: string;
  statusLabel: string;
  statusColor: string;
  notesPreview?: string;
  thumbnailUri?: string;
  lastInteractionAtISO?: string;
  lastInteractionTitle?: string;
  lastInteractionNotes?: string;
  lastInteractionPhotoUri?: string;
  onPress: () => void;
  onAddInteraction?: () => void;
  onPressLastInteraction?: () => void;
  cardBackgroundColor?: string;
  dividerColor?: string;
  /** Behind contain-mode logos; defaults to photoPlaceholder. */
  imageBackgroundColor?: string;
}) {
  const {
    name,
    scopeLabel,
    contactName,
    phone,
    statusLabel,
    statusColor,
    notesPreview,
    thumbnailUri,
    lastInteractionAtISO,
    lastInteractionTitle,
    lastInteractionNotes,
    lastInteractionPhotoUri,
    onPress,
    onAddInteraction,
    onPressLastInteraction,
    cardBackgroundColor,
    dividerColor,
    imageBackgroundColor,
  } = props;
  const scopeText = scopeLabel?.trim();
  const detailParts = [
    contactName,
    phone?.trim() ? formatPhoneNumber(phone) || phone.trim() : undefined,
  ].filter(Boolean);
  const notesText = notesPreview?.trim();
  const interactionTitle = lastInteractionTitle?.trim();
  const interactionNotes = lastInteractionNotes?.trim();
  const lastInteractionLine = [interactionTitle, interactionNotes].filter(Boolean).join(' · ');
  const showLastInteractionRow = Boolean(lastInteractionAtISO || lastInteractionLine);
  const showPhotoColumn = Boolean(thumbnailUri);
  const leftColWidth = ITEM_LIST_THUMB_SIZE;
  const thumbBg = imageBackgroundColor ?? colors.photoPlaceholder;

  return (
    <View
      style={[
        sharedStyles.card,
        {
          backgroundColor: cardBackgroundColor ?? colors.card,
          ...(dividerColor
            ? {
                marginBottom: 0,
                borderRadius: 0,
                borderWidth: 0,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: dividerColor,
              }
            : null),
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [pressed && sharedStyles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open vendor ${name}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {showPhotoColumn ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={{
                width: leftColWidth,
                height: ITEM_LIST_THUMB_SIZE,
                borderRadius: 2,
                backgroundColor: thumbBg,
              }}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[sharedStyles.cardTitle, { flexShrink: 1 }]} numberOfLines={2}>
                {name}
              </Text>
              {onAddInteraction ? (
                <Pressable
                  onPress={(e) => {
                    // Avoid triggering the row's open-vendor press.
                    e?.stopPropagation?.();
                    onAddInteraction();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`New interaction for ${name}`}
                  hitSlop={6}
                  style={({ pressed }) => ({
                    padding: 2,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <MaterialIcons name="add" size={22} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
            {scopeText ? (
              <Text style={sharedStyles.cardMeta} numberOfLines={1}>
                {scopeText}
              </Text>
            ) : null}
            {detailParts.length > 0 ? (
              <Text style={sharedStyles.cardMeta} numberOfLines={2}>
                {detailParts.join(' · ')}
              </Text>
            ) : null}
            <Text
              style={[sharedStyles.cardMeta, { color: statusColor, fontWeight: '600', marginTop: 4 }]}
            >
              {statusLabel}
            </Text>
            {notesText ? (
              <Text style={[sharedStyles.cardMeta, { marginTop: 4 }]} numberOfLines={4}>
                {notesText}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>

      {showLastInteractionRow ? (
        <Pressable
          onPress={onPressLastInteraction ?? onPress}
          style={({ pressed }) => [{ marginTop: 6 }, pressed && sharedStyles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open last interaction"
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            {lastInteractionPhotoUri ? (
              <Image
                source={{ uri: lastInteractionPhotoUri }}
                style={{
                  width: leftColWidth,
                  height: ITEM_LIST_THUMB_SIZE,
                  borderRadius: 2,
                  backgroundColor: thumbBg,
                  flexShrink: 0,
                }}
              />
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
              {lastInteractionAtISO ? (
                <InteractionDateText
                  iso={lastInteractionAtISO}
                  style={[sharedStyles.cardMeta, { marginTop: 0 }]}
                  restStyle={{ fontWeight: '400', color: colors.textMuted }}
                  numberOfLines={2}
                />
              ) : null}
              {lastInteractionLine ? (
                <Text
                  style={[
                    sharedStyles.cardMeta,
                    { marginTop: lastInteractionAtISO ? 2 : 0 },
                  ]}
                  numberOfLines={lastInteractionPhotoUri ? 6 : 3}
                >
                  {lastInteractionLine}
                </Text>
              ) : null}
            </View>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Property-wide interaction feed: contact + company above a VendorListRow-style strip. */
export function PropertyInteractionListRow(props: {
  projectName?: string;
  contactName?: string;
  companyName: string;
  companyPhotoUri?: string;
  /** When true, omit the company logo (shown once above the list for a single vendor). */
  hideCompanyPhoto?: boolean;
  /** When true, omit the vendor/owner header (e.g. Vendor detail — already on that vendor). */
  hideOwner?: boolean;
  vendorStatusLabel?: string;
  vendorStatusColor?: string;
  dateISO?: string;
  methodLabel: string;
  notes?: string;
  /** When search hit notes: snippet replacing full notes in the preview line. */
  searchSnippet?: string;
  /** When set (search), highlight first case-insensitive match in notes/snip. */
  highlightQuery?: string;
  /** When search hit a non-notes field: short meta like "Matched in contact". */
  matchHint?: string;
  photoUri?: string;
  important?: boolean;
  onPress: () => void;
  onPressVendor?: () => void;
  /** Add control on the vendor/owner header (e.g. new interaction). */
  onAddOwner?: () => void;
  cardBackgroundColor?: string;
  /** Slightly darker band behind the vendor/owner header (What's happening). */
  ownerBackgroundColor?: string;
  dividerColor?: string;
  /** Bottom divider thickness when `dividerColor` is set (default hairline). */
  dividerWidth?: number;
  /** Type glyph on the owner header (vendor), top-right. */
  ownerCornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
  /** Type glyph on the interaction detail strip, leftmost. */
  cornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
  /** Put relative `(# days…)` on its own bold line (Future Activity). */
  stackRelative?: boolean;
}) {
  const {
    projectName,
    contactName,
    companyName,
    companyPhotoUri,
    hideCompanyPhoto,
    hideOwner = false,
    vendorStatusLabel,
    vendorStatusColor,
    dateISO,
    methodLabel,
    notes,
    searchSnippet,
    highlightQuery,
    matchHint,
    photoUri,
    important,
    onPress,
    onPressVendor,
    onAddOwner,
    cardBackgroundColor,
    ownerBackgroundColor,
    dividerColor,
    dividerWidth,
    ownerCornerIcon,
    cornerIcon,
    stackRelative,
  } = props;
  const projectText = projectName?.trim();
  const contactText = contactName?.trim();
  const notesText = (searchSnippet ?? notes)?.trim();
  const methodText = methodLabel.trim();
  const matchHintText = matchHint?.trim();
  const statusText = vendorStatusLabel?.trim();
  const highlightQ = highlightQuery?.trim();
  const notesParts =
    highlightQ && notesText ? splitHighlightParts(notesText, highlightQ) : null;
  const showInteractionLine = Boolean(methodText || notesText);
  const showInteractionStrip = Boolean(
    dateISO || methodText || notesText || photoUri || important
  );
  const leftColWidth = ITEM_LIST_THUMB_SIZE;
  const showCompanyPhoto = !hideCompanyPhoto;
  const ownerBandStyle = ownerBackgroundColor
    ? {
        backgroundColor: ownerBackgroundColor,
        marginHorizontal: -16,
        marginTop: -16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
      }
    : null;

  const headerText = (
    <View style={{ flex: 1 }}>
      {projectText ? (
        <Text style={[sharedStyles.subtitle, { marginBottom: 2 }]} numberOfLines={1}>
          {projectText}
        </Text>
      ) : null}
      {contactText ? (
        <Text style={sharedStyles.cardTitle} numberOfLines={1}>
          {contactText}
        </Text>
      ) : (
        <Text style={[sharedStyles.cardTitle, { color: colors.textMuted }]} numberOfLines={1}>
          Not set
        </Text>
      )}
      <Text style={[sharedStyles.cardMeta, { marginTop: 2 }]} numberOfLines={2}>
        {companyName}
      </Text>
      {statusText ? (
        <Text
          style={[
            sharedStyles.cardMeta,
            {
              color: vendorStatusColor ?? colors.primary,
              fontWeight: '600',
              marginTop: 2,
            },
          ]}
          numberOfLines={1}
        >
          {statusText}
        </Text>
      ) : null}
    </View>
  );

  const ownerContent = (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      {showCompanyPhoto ? (
        companyPhotoUri ? (
          <Image
            source={{ uri: companyPhotoUri }}
            style={{
              width: leftColWidth,
              height: ITEM_LIST_THUMB_SIZE,
              borderRadius: 2,
              backgroundColor: colors.photoPlaceholder,
            }}
          />
        ) : (
          <View
            style={{
              width: leftColWidth,
              height: ITEM_LIST_THUMB_SIZE,
              borderRadius: 2,
              backgroundColor: colors.photoPlaceholder,
            }}
          />
        )
      ) : null}
      {headerText}
      {onAddOwner ? (
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onAddOwner();
          }}
          accessibilityRole="button"
          accessibilityLabel={`New interaction for ${companyName}`}
          hitSlop={6}
          style={({ pressed }) => ({
            padding: 2,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MaterialIcons name="add" size={22} color={colors.primary} />
        </Pressable>
      ) : null}
      {ownerCornerIcon ? (
        <MaterialIcons name={ownerCornerIcon} size={22} color={colors.primary} />
      ) : null}
    </View>
  );

  return (
    <View
      style={[
        sharedStyles.card,
        {
          backgroundColor: cardBackgroundColor ?? colors.card,
          ...(dividerColor
            ? {
                marginBottom: 0,
                borderRadius: 0,
                borderWidth: 0,
                borderBottomWidth: dividerWidth ?? StyleSheet.hairlineWidth,
                borderBottomColor: dividerColor,
              }
            : null),
        },
      ]}
    >
      {!hideOwner ? (
        onPressVendor ? (
          <Pressable
            onPress={onPressVendor}
            style={({ pressed }) => [ownerBandStyle, pressed && sharedStyles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open vendor ${companyName}`}
          >
            {ownerContent}
          </Pressable>
        ) : (
          <View style={ownerBandStyle ?? undefined}>{ownerContent}</View>
        )
      ) : null}

      {showInteractionStrip ? (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { marginTop: hideOwner ? 0 : ownerBackgroundColor ? 10 : 6 },
          pressed && sharedStyles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open interaction"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          {cornerIcon ? (
            <MaterialIcons name={cornerIcon} size={22} color={colors.primary} />
          ) : null}
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{
                width: leftColWidth,
                height: ITEM_LIST_THUMB_SIZE,
                borderRadius: 2,
                backgroundColor: colors.photoPlaceholder,
                flexShrink: 0,
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            {hideOwner && (projectText || contactText) ? (
              <View style={{ marginBottom: 2 }}>
                {projectText ? (
                  <Text style={[sharedStyles.subtitle, { marginBottom: 2 }]} numberOfLines={1}>
                    {projectText}
                  </Text>
                ) : null}
                {contactText ? (
                  <Text style={sharedStyles.cardTitle} numberOfLines={1}>
                    {contactText}
                  </Text>
                ) : null}
              </View>
            ) : null}
            {dateISO || important ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
              {important ? (
                <MaterialIcons
                  name="star"
                  size={16}
                  color={colors.primary}
                  accessibilityLabel="Important"
                  style={{ marginTop: 2 }}
                />
              ) : null}
              {dateISO ? (
              <InteractionDateText
                iso={dateISO}
                style={[sharedStyles.cardMeta, { flex: 1, marginTop: 0 }]}
                restStyle={{ fontWeight: '400', color: colors.textMuted }}
                stackRelative={stackRelative}
              />
              ) : null}
            </View>
            ) : null}
            {showInteractionLine ? (
              <Text
                style={[sharedStyles.cardMeta, { marginTop: 2 }]}
                numberOfLines={photoUri ? 6 : 3}
              >
                {methodText}
                {methodText && notesText ? ' · ' : null}
                {notesParts
                  ? notesParts.map((part, i) =>
                      part.highlight ? (
                        <Text
                          key={i}
                          style={{
                            backgroundColor: colors.searchHighlight,
                            color: colors.text,
                            fontWeight: '700',
                          }}
                        >
                          {part.text}
                        </Text>
                      ) : (
                        <Text key={i}>{part.text}</Text>
                      )
                    )
                  : notesText}
              </Text>
            ) : null}
            {matchHintText ? (
              <Text
                style={[sharedStyles.cardMeta, { marginTop: 2, color: colors.textMuted }]}
                numberOfLines={1}
              >
                {matchHintText}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
      ) : null}
    </View>
  );
}

export function PropertyServiceListRow(props: {
  scopeLabel?: string;
  itemName: string;
  itemPhotoUri?: string;
  /** When true, omit the item photo (shown once above the list for a single item). */
  hideItemPhoto?: boolean;
  dateLabel: string;
  /** When set with stackRelative, renders via InteractionDateText instead of dateLabel. */
  dateISO?: string;
  /** Put relative `(# days…)` on its own bold line (Future Activity). */
  stackRelative?: boolean;
  statusLabel: string;
  title: string;
  notes?: string;
  company?: string;
  /** When search hit notes: snippet replacing full notes in the preview line. */
  searchSnippet?: string;
  /** When set (search), highlight first case-insensitive match in detail line. */
  highlightQuery?: string;
  /** When search hit a non-notes field: short meta like "Matched in title". */
  matchHint?: string;
  photoUri?: string;
  onPress: () => void;
  onPressItem: () => void;
  cardBackgroundColor?: string;
  /** Slightly darker band behind the room/asset header (What's happening). */
  ownerBackgroundColor?: string;
  dividerColor?: string;
  /** Bottom divider thickness when `dividerColor` is set (default hairline). */
  dividerWidth?: number;
  /** Type glyph on the asset header, top-right. */
  ownerCornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
  /** Type glyph on the service detail strip, leftmost. */
  cornerIcon?: React.ComponentProps<typeof MaterialIcons>['name'];
}) {
  const {
    scopeLabel,
    itemName,
    itemPhotoUri,
    hideItemPhoto,
    dateLabel,
    dateISO,
    stackRelative,
    statusLabel,
    title,
    notes,
    company,
    searchSnippet,
    highlightQuery,
    matchHint,
    photoUri,
    onPress,
    onPressItem,
    cardBackgroundColor,
    ownerBackgroundColor,
    dividerColor,
    dividerWidth,
    ownerCornerIcon,
    cornerIcon,
  } = props;
  const scopeText = scopeLabel?.trim();
  const titleText = title.trim();
  const detailLine = [titleText, (searchSnippet ?? notes)?.trim(), company?.trim()]
    .filter(Boolean)
    .join(' · ');
  const matchHintText = matchHint?.trim();
  const highlightQ = highlightQuery?.trim();
  const detailParts =
    highlightQ && detailLine ? splitHighlightParts(detailLine, highlightQ) : null;
  const leftColWidth = ITEM_LIST_THUMB_SIZE;
  const showItemPhoto = !hideItemPhoto;
  const ownerBandStyle = ownerBackgroundColor
    ? {
        backgroundColor: ownerBackgroundColor,
        marginHorizontal: -16,
        marginTop: -16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 10,
      }
    : null;

  return (
    <View
      style={[
        sharedStyles.card,
        {
          backgroundColor: cardBackgroundColor ?? colors.card,
          ...(dividerColor
            ? {
                marginBottom: 0,
                borderRadius: 0,
                borderWidth: 0,
                borderBottomWidth: dividerWidth ?? StyleSheet.hairlineWidth,
                borderBottomColor: dividerColor,
              }
            : null),
        },
      ]}
    >
      <Pressable
        onPress={onPressItem}
        style={({ pressed }) => [ownerBandStyle, pressed && sharedStyles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open asset ${itemName}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {showItemPhoto ? (
            itemPhotoUri ? (
              <Image
                source={{ uri: itemPhotoUri }}
                style={{
                  width: leftColWidth,
                  height: ITEM_LIST_THUMB_SIZE,
                  borderRadius: 2,
                  backgroundColor: colors.photoPlaceholder,
                }}
              />
            ) : (
              <View
                style={{
                  width: leftColWidth,
                  height: ITEM_LIST_THUMB_SIZE,
                  borderRadius: 2,
                  backgroundColor: colors.photoPlaceholder,
                }}
              />
            )
          ) : null}
          <View style={{ flex: 1 }}>
            {scopeText ? (
              <Text style={[sharedStyles.subtitle, { marginBottom: 2 }]} numberOfLines={1}>
                {scopeText}
              </Text>
            ) : null}
            <Text style={sharedStyles.cardTitle} numberOfLines={2}>
              {itemName}
            </Text>
          </View>
          {ownerCornerIcon ? (
            <MaterialIcons name={ownerCornerIcon} size={22} color={colors.primary} />
          ) : null}
        </View>
      </Pressable>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { marginTop: ownerBackgroundColor ? 10 : 6 },
          pressed && sharedStyles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Open service"
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          {cornerIcon ? (
            <MaterialIcons name={cornerIcon} size={22} color={colors.primary} />
          ) : null}
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={{
                width: leftColWidth,
                height: ITEM_LIST_THUMB_SIZE,
                borderRadius: 2,
                backgroundColor: colors.photoPlaceholder,
                flexShrink: 0,
              }}
            />
          ) : null}
          <View style={{ flex: 1 }}>
            {dateISO && stackRelative ? (
              <InteractionDateText
                iso={dateISO}
                style={[
                  sharedStyles.cardMeta,
                  { marginTop: 0, color: colors.lastService },
                ]}
                dateStyle={{ color: colors.lastService }}
                restStyle={{ fontWeight: '400', color: colors.lastService }}
                relativeStyle={{ color: colors.lastService }}
                stackRelative
              />
            ) : (
              <Text
                style={[
                  sharedStyles.cardMeta,
                  {
                    marginTop: 0,
                    color: colors.lastService,
                  },
                ]}
              >
                {boldTodayNodes(dateLabel)}
              </Text>
            )}
            <Text
              style={[
                sharedStyles.cardMeta,
                { marginTop: 2, color: colors.lastService },
              ]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
            {detailLine ? (
              <Text
                style={[
                  sharedStyles.cardMeta,
                  { marginTop: 2, color: colors.lastService },
                ]}
                numberOfLines={photoUri ? 6 : 3}
              >
                {detailParts
                  ? detailParts.map((part, i) =>
                      part.highlight ? (
                        <Text
                          key={i}
                          style={{
                            backgroundColor: colors.searchHighlight,
                            color: colors.text,
                            fontWeight: '700',
                          }}
                        >
                          {part.text}
                        </Text>
                      ) : (
                        <Text key={i}>{part.text}</Text>
                      )
                    )
                  : detailLine}
              </Text>
            ) : null}
            {matchHintText ? (
              <Text
                style={[
                  sharedStyles.cardMeta,
                  { marginTop: 2, color: colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {matchHintText}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
