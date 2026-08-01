import React from 'react';
import { Text } from '../textScale';
import { colors } from '../theme';

type GearKeywordLabelProps = {
  prefix: 'New' | 'Search' | (string & {});
  keyword: string;
};

/** Gear menu row label: plain prefix + blue Title Case keyword. */
export function GearKeywordLabel({ prefix, keyword }: GearKeywordLabelProps) {
  return (
    <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>
      {prefix}{' '}
      <Text style={{ color: colors.sectionTitle, fontWeight: '600' }}>{keyword}</Text>
    </Text>
  );
}
