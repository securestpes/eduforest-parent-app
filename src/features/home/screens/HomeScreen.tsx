import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useAppLanguage } from "../../../common";
import { useParentTheme } from "../../../theme/useParentTheme";
import type { RootStackParamList } from "../../../navigation/Navigation";
import { useMainTabNavigation } from "../../../navigation/TabNavigationContext";
import { EmptyState } from "../../../components/EmptyState";
import { useHomeDashboard } from "../hooks/useHomeDashboard";
import { HomeHero, homeHeroHeight, HOME_SHEET_OVERLAP } from "../components/HomeHero";
import { COMPACT_BAR_HEIGHT, HomeCompactHeader } from "../components/HomeCompactHeader";
import { ChildrenCarousel } from "../components/ChildrenCarousel";
import { OverviewGrid, type OverviewTile } from "../components/OverviewGrid";
import { HomeExamsBanner } from "../components/HomeExamsBanner";
import { UpcomingEventsList } from "../components/UpcomingEventsList";
import { normalizeUploadUrl } from "../../../common/helpers/normalizeUploadUrl";

export function HomeScreen() {
  const { t } = useAppLanguage();
  const theme = useParentTheme();
  const { colors, spacing, typography } = theme;
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { navigateToTab } = useMainTabNavigation();
  const dash = useHomeDashboard();
  const scrollY = useRef(new Animated.Value(0)).current;
  const compactRef = useRef(false);
  const [compact, setCompact] = useState(false);
  const heroH = homeHeroHeight(Dimensions.get("window").width, insets.top);
  const sheetOverlap = HOME_SHEET_OVERLAP;
  const collapseDistance = Math.max(heroH - sheetOverlap - COMPACT_BAR_HEIGHT, 120);

  const compactOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [
          8,
          collapseDistance * 0.28,
          collapseDistance * 0.62,
          collapseDistance,
        ],
        outputRange: [0, 0.18, 0.82, 1],
        extrapolate: "clamp",
      }),
    [collapseDistance, scrollY],
  );

  const logoShift = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, collapseDistance],
        outputRange: [0, 0],
        extrapolate: "clamp",
      }),
    [collapseDistance, scrollY],
  );

  const heroContentOpacity = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [0, collapseDistance * 0.45, collapseDistance * 0.85],
        outputRange: [1, 0.45, 0],
        extrapolate: "clamp",
      }),
    [collapseDistance, scrollY],
  );

  const greetingKey =
    dash.greetingHour === "morning"
      ? "greeting.morning"
      : dash.greetingHour === "afternoon"
        ? "greeting.afternoon"
        : "greeting.evening";
  const greeting = `${t(greetingKey)}, 👋`;

  const openChildHub = (
    section:
      | "attendance"
      | "fees"
      | "exams"
      | "leaves"
      | "calendar"
      | "notifications"
      | "homework",
    examsTab?: "upcoming" | "results",
  ) => {
    if (!dash.student) return;
    dash.setSelected(dash.student.id);
    navigation.navigate("ChildHub", {
      studentId: dash.student.id,
      section,
      examsTab,
    });
  };

  const tiles: OverviewTile[] = dash.student
    ? [
        {
          key: "attendance",
          label: t("childChips.attendance"),
          metric: dash.attendancePct != null ? `${dash.attendancePct}%` : "—",
          sub: t("home.statsThisMonth"),
          icon: "calendar-check",
          accent: colors.modules.attendance,
          onPress: () => navigateToTab("Attendance"),
        },
        {
          key: "fees",
          label: t("home.feesDue"),
          metric: dash.feeMetric,
          sub: dash.feeSub
            ? t("home.dueOn", { date: dash.feeSub })
            : t("home.statsThisMonth"),
          icon: "wallet-outline",
          accent: colors.modules.fees,
          onPress: () => navigateToTab("Fees"),
        },
        {
          key: "homework",
          label: t("home.homework"),
          metric:
            dash.pendingHomework != null ? String(dash.pendingHomework) : "—",
          sub: t("home.pendingCount"),
          icon: "book-open-page-variant",
          accent: colors.modules.homework,
          onPress: () => openChildHub("homework"),
        },
        {
          key: "leaves",
          label: t("home.leaves"),
          metric:
            dash.pendingLeaves != null ? String(dash.pendingLeaves) : "—",
          sub: t("home.pendingCount"),
          icon: "calendar-remove",
          accent: colors.modules.leaves,
          onPress: () => openChildHub("leaves"),
        },
        // {
        //   key: "transport",
        //   label: t("home.transport"),
        //   metric: dash.bus
        //     ? t("home.busNamed", { n: dash.bus.busNumber })
        //     : t("home.noBus"),
        //   sub: dash.bus?.pickupStopName || t("childChips.bus"),
        //   icon: "bus",
        //   accent: colors.modules.transport,
        //   onPress: () => {
        //     if (!dash.student) return;
        //     dash.setSelected(dash.student.id);
        //     navigation.navigate("BusTrackingMap", {
        //       studentId: dash.student.id,
        //     });
        //   },
        // },
        // {
        //   key: "announcements",
        //   label: t("home.announcements"),
        //   metric: String(dash.unreadCount),
        //   sub: t("home.newUpdates"),
        //   icon: "bullhorn-outline",
        //   accent: colors.modules.announcements,
        //   onPress: () => void openNotificationCenter(),
        // },
      ]
    : [];

  if (dash.loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            typography.body,
            { color: colors.textSecondary, marginTop: 12 },
          ]}
        >
          {t("home.loadingDashboard")}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={styles.heroBack} pointerEvents="none">
        <HomeHero
          greeting={greeting}
          welcome={t("home.welcomeBack")}
          contentOpacity={heroContentOpacity}
        />
      </View>

      <Animated.ScrollView
        style={styles.scroller}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="normal"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
              const y = e.nativeEvent.contentOffset.y;
              const next = y > collapseDistance * 0.72;
              if (next !== compactRef.current) {
                compactRef.current = next;
                setCompact(next);
              }
            },
          },
        )}
        refreshControl={
          <RefreshControl
            refreshing={dash.refreshing}
            onRefresh={() => void dash.refresh()}
            tintColor={colors.headerOn}
          />
        }
        contentContainerStyle={{
          paddingTop: heroH - sheetOverlap,
          paddingBottom: 32,
        }}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View style={{ paddingHorizontal: spacing.lg, marginTop: 8 }}>
            {dash.error ? (
              <Text
                style={[
                  typography.body,
                  { color: colors.danger, marginBottom: 12 },
                ]}
              >
                {dash.error}
              </Text>
            ) : null}

            <View style={styles.sectionHead}>
              <Text style={[typography.section, { color: colors.text }]}>
                {t("home.myChildren")}
              </Text>
            </View>
          </View>

          {dash.students.length === 0 ? (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: 8 }}>
              <EmptyState
                icon="account-child-outline"
                title={t("home.noStudentsTitle")}
                message={t("home.noStudentsMessage")}
              />
            </View>
          ) : (
            <View style={{ marginBottom: 8 }}>
              <ChildrenCarousel
                students={dash.students}
                selectedId={dash.student?.id}
                onSelect={dash.setSelected}
              />
            </View>
          )}

          {dash.student ? (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: 8 }}>
              <View style={styles.sectionHead}>
                <Text style={[typography.section, { color: colors.text }]}>
                  {t("home.quickOverview", { name: dash.firstName })}
                </Text>
              </View>
              <OverviewGrid tiles={tiles} />
              <View style={{ marginTop: spacing.base }}>
                <HomeExamsBanner
                  nextExam={dash.nextExam}
                  latestResult={dash.latestResult}
                  hasAnyExams={dash.hasAnyExams}
                  onOpenUpcoming={() => openChildHub("exams", "upcoming")}
                  onOpenResults={() => openChildHub("exams", "results")}
                />
              </View>

              <View style={[styles.sectionHead, { marginTop: spacing.xl }]}>
                <Text style={[typography.section, { color: colors.text }]}>
                  {t("home.upcomingEvents")}
                </Text>
                <Pressable
                  onPress={() => navigateToTab("Calendar")}
                  hitSlop={8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
                >
                  <Text style={[typography.meta, { color: colors.primary }]}>
                    {t("home.schoolCalendar")}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>
              </View>
              <UpcomingEventsList
                events={dash.upcomingEvents}
                emptyLabel={t("home.noUpcomingEvents")}
                onOpen={() => navigateToTab("Calendar")}
              />
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>
      <HomeCompactHeader
        barOpacity={compactOpacity}
        logoShift={logoShift}
        compact={compact}
        schoolLogoUrl={normalizeUploadUrl(
          dash.student?.instituteLogo ||
            dash.students.find((s) => s.instituteLogo)?.instituteLogo,
        )}
        schoolName={
          dash.student?.instituteName ||
          dash.students.find((s) => s.instituteName)?.instituteName ||
          dash.parentSchoolName ||
          ""
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroBack: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  scroller: {
    flex: 1,
    zIndex: 1,
    backgroundColor: "transparent",
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    minHeight: 400,
    zIndex: 2,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
  },
});
