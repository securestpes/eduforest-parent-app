import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { List, Text } from 'react-native-paper';
import { createAppStyles } from '../app-styles';
import { useAppTheme } from '../contexts';
import type { AppTheme } from '../../theme';

interface ISectionProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

interface ISectionHeaderProps {
  title?: React.ReactNode;
  subTitle?: string | React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export const SectionHeader: React.FC<ISectionHeaderProps> = ({
  title,
  subTitle,
  left,
  right,
}) => {
  const { theme } = useAppTheme();
  const appStyles = createAppStyles(theme);
  const styles = createStyles(theme);
  return (
    <List.Item
      style={{ paddingRight: 0 }}
      contentStyle={{ paddingLeft: 0 }}
      containerStyle={styles.listItemContainer}
      title={<Text style={[appStyles.sectionHeading]}>{title}</Text>}
      description={subTitle}
      left={() => left}
      right={() => right}
    />
  );
};

export const Section: React.FC<ISectionProps> = ({ children, style }) => {
  return <View style={[style]}>{children}</View>;
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    listItemContainer: { alignItems: 'center', height: 25 },
  });
