import React from 'react';
import { ScrollView, View, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Text, Card, Icon } from 'react-native-paper';
import { createAppStyles, Section, useAppLanguage, useAppTheme } from '../../../common';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppTheme } from '../../../theme';
import { AppInfoFooter } from './AppInfoFooter';
import { TERMS_PAGE } from '../content/localizedStaticContent';

export const TermsAndConditions = () => {
  const { theme } = useAppTheme();
  const { language } = useAppLanguage();
  const styles = createStyles(theme);
  const appStyles = createAppStyles(theme);
  const content = TERMS_PAGE[language];

  return (
    <SafeAreaView style={appStyles.pageContainer} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section style={appStyles.pageHPadding}>
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Icon source="file-document-outline" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.headerTitle}>{content.headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{content.headerSubtitle}</Text>
          </View>

          <Text style={styles.introText}>{content.introText}</Text>

          {content.sections.map((section, index) => (
            <Card key={index} style={styles.card} elevation={1}>
              <Card.Title
                title={section.title}
                titleNumberOfLines={3}
                titleStyle={styles.cardTitle}
                left={() => (
                  <View style={[styles.sectionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                    <Icon source={section.icon} size={24} color={theme.colors.primary} />
                  </View>
                )}
              />
              <Card.Content>
                <Text style={styles.sectionContent}>{section.content}</Text>
              </Card.Content>
            </Card>
          ))}

          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:securestepsai@gmail.com')}
            style={styles.contactButton}
          >
            <Text style={styles.contactButtonText}>{content.contactButton}</Text>
          </TouchableOpacity>

          <AppInfoFooter />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scrollContent: {
      paddingVertical: theme.margin.md,
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: theme.margin.xl,
      marginTop: theme.margin.sm,
    },
    iconContainer: {
      width: 90,
      height: 90,
      borderRadius: 45,
      backgroundColor: theme.colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.margin.md,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
    },
    introText: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      marginBottom: theme.margin.lg,
      textAlign: 'center',
    },
    card: {
      marginBottom: theme.margin.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      flexWrap: 'wrap',
      lineHeight: 24,
    },
    sectionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    sectionContent: {
      fontSize: 15,
      color: theme.colors.secondaryText,
      lineHeight: 22,
    },
    contactButton: {
      marginVertical: theme.margin.xl,
      padding: theme.padding.md,
      backgroundColor: theme.colors.primary + '15',
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
    },
    contactButtonText: {
      color: theme.colors.primary,
      fontWeight: '600',
      fontSize: 16,
    },
  });
