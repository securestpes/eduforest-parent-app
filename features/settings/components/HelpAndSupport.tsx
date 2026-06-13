import React, { useState } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  Linking,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, Card, Icon, Divider, TextInput } from 'react-native-paper';
import { createAppStyles, Section, useAppLanguage, useAppTheme } from '../../../common';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { AppTheme } from '../../../theme';
import type { RootStackParamList } from '../../../navigation/Navigation';
import type { MainTabParamList } from '../../../src/navigation/MainTabs';
import { navigateToChildScreen, navigateToTab } from '../../../src/navigation/navigationRef';
import type { ChildHubSection } from '../../../src/navigation/navigationRef';
import { AppInfoFooter } from './AppInfoFooter';
import { getLocalizedParentHelpFaqs } from '../content/localizedStaticContent';

if (Platform.OS === 'android') {
  try {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
  } catch (e) {
    console.warn('LayoutAnimation is not supported', e);
  }
}

type QuickStartItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: 'primary' | 'secondary' | 'tertiary';
  destination: { type: 'tab'; screen: keyof MainTabParamList } | { type: 'hub'; section: ChildHubSection };
};

export const HelpAndSupport = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { theme } = useAppTheme();
  const { t, language } = useAppLanguage();
  const styles = createStyles(theme);
  const appStyles = createAppStyles(theme);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const QUICK_START_ITEMS: QuickStartItem[] = [
    {
      id: 'home',
      title: t('help.parentQuickHomeTitle'),
      description: t('help.parentQuickHomeDesc'),
      icon: 'home-variant-outline',
      color: 'primary',
      destination: { type: 'tab', screen: 'Home' },
    },
    {
      id: 'attendance',
      title: t('help.parentQuickAttendanceTitle'),
      description: t('help.parentQuickAttendanceDesc'),
      icon: 'calendar-check',
      color: 'secondary',
      destination: { type: 'hub', section: 'attendance' },
    },
    {
      id: 'alerts',
      title: t('help.parentQuickAlertsTitle'),
      description: t('help.parentQuickAlertsDesc'),
      icon: 'bell-ring-outline',
      color: 'tertiary',
      destination: { type: 'hub', section: 'notifications' },
    },
  ];

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleEmailSupport = () => {
    Linking.openURL('mailto:securestepsai@gmail.com');
  };

  const handleOpenWebsite = () => {
    Linking.openURL('https://eduforest.co.in');
  };

  const filteredFaqs = getLocalizedParentHelpFaqs(language).filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={appStyles.pageContainer} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Section style={appStyles.pageHPadding}>
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Icon source="lifebuoy" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.headerTitle}>{t('help.centerTitle')}</Text>
            <Text style={styles.headerSubtitle}>{t('help.centerSubtitle')}</Text>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              mode="outlined"
              placeholder={t('help.searchPlaceholder')}
              value={searchQuery}
              onChangeText={setSearchQuery}
              left={<TextInput.Icon icon="magnify" />}
              style={styles.searchInput}
              outlineStyle={styles.searchOutline}
            />
          </View>

          <Text style={styles.sectionHeader}>{t('help.quickStart')}</Text>
          <View style={styles.quickStartList}>
            {QUICK_START_ITEMS.map((item) => {
              const accentColor =
                item.color === 'primary'
                  ? theme.colors.primary
                  : item.color === 'secondary'
                    ? theme.colors.secondary
                    : theme.palette.card4_base;

              return (
                <Card
                  key={item.id}
                  style={styles.quickStartCard}
                  elevation={0}
                  onPress={() => {
                    navigation.navigate('MainTabs');
                    if (item.destination.type === 'tab') {
                      navigateToTab({ tab: item.destination.screen });
                    } else {
                      navigateToChildScreen({ section: item.destination.section });
                    }
                  }}
                >
                  <Card.Content style={styles.quickStartContent}>
                    <View
                      style={[
                        styles.quickStartIcon,
                        { backgroundColor: `${accentColor}15` },
                      ]}
                    >
                      <Icon source={item.icon} size={22} color={accentColor} />
                    </View>
                    <View style={styles.quickStartTextContainer}>
                      <Text style={styles.quickStartTitle}>{item.title}</Text>
                      <Text style={styles.quickStartDescription}>{item.description}</Text>
                    </View>
                    <Icon source="chevron-right" size={20} color={theme.colors.secondaryText} />
                  </Card.Content>
                </Card>
              );
            })}
          </View>

          <Text style={styles.sectionHeader}>{t('help.quickContact')}</Text>
          <View style={styles.contactContainer}>
            <Card style={styles.contactCard} elevation={0} onPress={handleEmailSupport}>
              <Card.Content style={styles.contactContent}>
                <View style={[styles.contactIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Icon source="email-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.contactTitle}>{t('help.emailSupport')}</Text>
                <Text style={styles.contactSub}>{t('help.response24h')}</Text>
              </Card.Content>
            </Card>

            <View style={{ width: 12 }} />

            <Card style={styles.contactCard} elevation={0} onPress={handleOpenWebsite}>
              <Card.Content style={styles.contactContent}>
                <View style={[styles.contactIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                  <Icon source="web" size={24} color={theme.colors.secondary} />
                </View>
                <Text style={styles.contactTitle}>{t('help.visitWebsite')}</Text>
                <Text style={styles.contactSub}>{t('help.websiteDomain')}</Text>
              </Card.Content>
            </Card>
          </View>

          <Card style={styles.addressCard} elevation={0}>
            <Card.Content style={styles.addressContent}>
              <View style={[styles.contactIcon, { backgroundColor: theme.palette.card4_alpha }]}>
                <Icon source="map-marker-outline" size={24} color={theme.palette.card4_base} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactTitle}>{t('help.officeAddress')}</Text>
                <Text style={styles.addressText}>{t('help.officeAddressText')}</Text>
              </View>
            </Card.Content>
          </Card>

          <Text style={styles.sectionHeader}>{t('help.faqTitle')}</Text>

          <View style={styles.faqList}>
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <Card key={item.id} style={styles.faqCard} elevation={0}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => toggleExpand(item.id)}
                      style={styles.faqHeader}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.faqCategory}>{item.category}</Text>
                        <Text style={[styles.faqQuestion, isExpanded && { color: theme.colors.primary }]}>
                          {item.question}
                        </Text>
                      </View>
                      <Icon
                        source={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={isExpanded ? theme.colors.primary : theme.colors.secondaryText}
                      />
                    </TouchableOpacity>
                    {isExpanded && (
                      <View style={styles.faqAnswerContainer}>
                        <Divider style={{ marginBottom: 12, backgroundColor: theme.colors.border }} />
                        <Text style={styles.faqAnswer}>{item.answer}</Text>
                      </View>
                    )}
                  </Card>
                );
              })
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>
                  {t('help.noResultsFor', { query: searchQuery })}
                </Text>
              </View>
            )}
          </View>

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
      marginBottom: theme.margin.lg,
      marginTop: theme.margin.sm,
    },
    iconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '10',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.margin.md,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      textAlign: 'center',
    },
    searchContainer: {
      marginBottom: theme.margin.xl,
    },
    quickStartList: {
      gap: theme.margin.md,
      marginBottom: theme.margin.xl,
    },
    quickStartCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    quickStartContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.margin.md,
    },
    quickStartIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickStartTextContainer: {
      flex: 1,
    },
    quickStartTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    quickStartDescription: {
      fontSize: 12,
      color: theme.colors.secondaryText,
      lineHeight: 18,
    },
    searchInput: {
      backgroundColor: theme.colors.surface,
      fontSize: 14,
    },
    searchOutline: {
      borderRadius: theme.borderRadius.lg,
      borderColor: theme.colors.border,
    },
    contactContainer: {
      flexDirection: 'row',
      marginBottom: theme.margin.xl,
    },
    addressCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.margin.xl,
    },
    addressContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.margin.md,
      paddingVertical: theme.padding.md,
    },
    contactCard: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contactContent: {
      alignItems: 'center',
      paddingVertical: theme.padding.lg,
    },
    contactIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.margin.md,
    },
    contactTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 2,
    },
    contactSub: {
      fontSize: 11,
      color: theme.colors.secondaryText,
    },
    addressText: {
      fontSize: 13,
      color: theme.colors.secondaryText,
      lineHeight: 18,
    },
    sectionHeader: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: theme.margin.md,
      marginLeft: 4,
    },
    faqList: {
      gap: theme.margin.md,
    },
    faqCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    faqHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.padding.md,
    },
    faqCategory: {
      fontSize: 10,
      color: theme.colors.primary,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 2,
      letterSpacing: 0.5,
    },
    faqQuestion: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    faqAnswerContainer: {
      paddingHorizontal: theme.padding.md,
      paddingBottom: theme.padding.md,
    },
    faqAnswer: {
      fontSize: 14,
      color: theme.colors.secondaryText,
      lineHeight: 22,
    },
    noResults: {
      alignItems: 'center',
      padding: theme.padding.xl,
    },
    noResultsText: {
      color: theme.colors.secondaryText,
      fontSize: 14,
    },
  });
