import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  type LatLng,
} from 'react-native-maps';
import { Text, useTheme } from 'react-native-paper';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { AppTheme } from '../theme';
import { useAppLanguage } from '../common';
import type { RootStackParamList } from '../navigation/Navigation';
import {
  getLiveBusLocation,
  getParentChildrenBuses,
  type LiveBusLocation,
  type ParentBusStop,
  type ParentChildBus,
} from '../services/transport';

const POLL_MS = 7000;

const DEFAULT_REGION = {
  latitude: 26.87,
  longitude: 80.91,
  latitudeDelta: 0.035,
  longitudeDelta: 0.025,
};

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function BusTrackingScreen() {
  const theme = useTheme() as AppTheme;
  const { t } = useAppLanguage();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'BusTrackingMap'>>();
  const params = route.params ?? {};
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ParentChildBus[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [live, setLive] = useState<LiveBusLocation | null>(null);
  const [etaLocal, setEtaLocal] = useState<{ km: number; min: number } | null>(
    null
  );
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [trackingOn, setTrackingOn] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeChild = children[activeIdx];
  const busId = activeChild?.busId ?? params.busId;
  const studentId = activeChild?.studentId ?? params.studentId;

  const loadChildren = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getParentChildrenBuses();
      const list = Array.isArray(res.data) ? res.data : [];
      let picked = 0;
      if (params.studentId != null) {
        const idx = list.findIndex((c) => c.studentId === params.studentId);
        if (idx >= 0) picked = idx;
      } else if (params.busId != null) {
        const idx = list.findIndex((c) => c.busId === params.busId);
        if (idx >= 0) picked = idx;
      }
      setChildren(list);
      setActiveIdx(picked);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('busTracking.loadFailed');
      setErrorMsg(message);
      setChildren([]);
    } finally {
      setLoading(false);
    }
  }, [params.busId, params.studentId, t]);

  useFocusEffect(
    useCallback(() => {
      void loadChildren();
    }, [loadChildren])
  );

  const fetchLive = useCallback(async () => {
    if (busId == null || studentId == null) return;
    try {
      const res = await getLiveBusLocation(busId, studentId);
      if (!res.data) return;
      setLive(res.data);
      if (
        res.data.latitude != null &&
        res.data.longitude != null &&
        res.data.remainingDistanceKm == null
      ) {
        const dropLat = activeChild?.dropStopLat;
        const dropLng = activeChild?.dropStopLng;
        if (dropLat != null && dropLng != null) {
          const km = haversineKm(
            res.data.latitude,
            res.data.longitude,
            dropLat,
            dropLng
          );
          setEtaLocal({ km: Math.round(km * 10) / 10, min: Math.max(1, Math.ceil(km * 2)) });
        } else {
          setEtaLocal(null);
        }
      } else {
        setEtaLocal(null);
      }
    } catch {
      // keep last known location while polling
    }
  }, [
    activeChild?.dropStopLat,
    activeChild?.dropStopLng,
    busId,
    studentId,
  ]);

  useEffect(() => {
    if (!trackingOn || busId == null || studentId == null) return;
    void fetchLive();
    const id = setInterval(() => {
      void fetchLive();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [busId, studentId, trackingOn, fetchLive]);

  useEffect(() => {
    const lat = live?.latitude ?? activeChild?.dropStopLat ?? DEFAULT_REGION.latitude;
    const lng =
      live?.longitude ?? activeChild?.dropStopLng ?? DEFAULT_REGION.longitude;
    mapRef.current?.animateToRegion(
      {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.025,
        longitudeDelta: 0.02,
      },
      700
    );
  }, [
    live?.latitude,
    live?.longitude,
    activeChild?.dropStopLat,
    activeChild?.dropStopLng,
  ]);

  const routeCoords = useMemo<LatLng[]>(() => {
    const arr: LatLng[] = [];
    for (const s of activeChild?.routeStops ?? []) {
      if (s.latitude != null && s.longitude != null) {
        arr.push({ latitude: s.latitude, longitude: s.longitude });
      }
    }
    if (live?.latitude != null && live?.longitude != null) {
      arr.unshift({ latitude: live.latitude, longitude: live.longitude });
    }
    return arr;
  }, [activeChild?.routeStops, live?.latitude, live?.longitude]);

  const etaKm = live?.remainingDistanceKm ?? etaLocal?.km;
  const etaMin = live?.estimatedArrivalMinutes ?? etaLocal?.min;

  const tripStatus = useMemo(() => {
    const s = live?.activeTripStatus ?? activeChild?.activeTripStatus;
    if (s === 'IN_PROGRESS') {
      return {
        label: t('busTracking.tripInProgress'),
        color: theme.colors.success,
        bg: `${theme.colors.success}1A`,
      };
    }
    if (s === 'COMPLETED') {
      return {
        label: t('busTracking.tripCompleted'),
        color: theme.colors.primary,
        bg: theme.colors.primaryContainer,
      };
    }
    if (s === 'CANCELLED') {
      return {
        label: t('busTracking.tripCancelled'),
        color: theme.colors.error,
        bg: `${theme.colors.error}1A`,
      };
    }
    return {
      label: t('busTracking.tripNotStarted'),
      color: theme.colors.onSurfaceVariant,
      bg: theme.colors.surfaceVariant,
    };
  }, [
    activeChild?.activeTripStatus,
    live?.activeTripStatus,
    t,
    theme.colors,
  ]);

  const shareLocation = async () => {
    const lat =
      live?.latitude ?? activeChild?.dropStopLat ?? DEFAULT_REGION.latitude;
    const lng =
      live?.longitude ?? activeChild?.dropStopLng ?? DEFAULT_REGION.longitude;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    try {
      await Share.share({
        message: `${t('busTracking.shareMessage', {
          bus: activeChild?.busNumber || '',
          name: activeChild?.studentName || '',
          url,
        })}`,
        url: Platform.OS === 'ios' ? url : undefined,
      });
    } catch {
      // ignored
    }
  };

  const callDriver = () => {
    const m = live?.driverMobile ?? activeChild?.driverMobile;
    if (!m) {
      Alert.alert(t('busTracking.noDriverContact'));
      return;
    }
    void Linking.openURL(`tel:${m}`);
  };

  const callAssistant = () => {
    if (!activeChild?.assistantMobile) {
      Alert.alert(t('busTracking.noAssistantContact'));
      return;
    }
    void Linking.openURL(`tel:${activeChild.assistantMobile}`);
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={22}
            color={theme.colors.onSurface}
          />
        </Pressable>
        <View style={styles.headerText}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }} numberOfLines={1}>
            {activeChild?.studentName ?? t('busTracking.title')}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}
          >
            {activeChild
              ? t('busTracking.busLine', { number: activeChild.busNumber })
              : t('busTracking.noActiveBus')}
          </Text>
        </View>
        <Pressable
          onPress={() => void shareLocation()}
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <MaterialCommunityIcons
            name="share-variant"
            size={20}
            color={theme.colors.onSurface}
          />
        </Pressable>
        <Pressable
          onPress={() => setTrackingOn((v) => !v)}
          style={[
            styles.iconBtn,
            { backgroundColor: theme.colors.surfaceVariant, marginLeft: 8 },
          ]}
        >
          <MaterialCommunityIcons
            name={trackingOn ? 'crosshairs-gps' : 'crosshairs-off'}
            size={20}
            color={
              trackingOn ? theme.colors.success : theme.colors.onSurfaceVariant
            }
          />
        </Pressable>
      </View>

      {children.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.tabBar,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {children.map((c, i) => {
            const active = i === activeIdx;
            return (
              <Pressable
                key={c.assignmentId}
                onPress={() => setActiveIdx(i)}
                style={styles.tab}
              >
                <View
                  style={[
                    styles.tabAvatar,
                    {
                      backgroundColor: active
                        ? theme.colors.primary
                        : theme.colors.surfaceVariant,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontWeight: '800',
                      color: active
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant,
                    }}
                  >
                    {c.studentName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  variant="labelSmall"
                  style={{
                    marginTop: 4,
                    maxWidth: 80,
                    textAlign: 'center',
                    fontWeight: active ? '700' : '500',
                    color: active
                      ? theme.colors.onSurface
                      : theme.colors.onSurfaceVariant,
                  }}
                >
                  {c.studentName}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.mapWrap}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : errorMsg ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={40}
              color={theme.colors.error}
            />
            <Text style={{ marginTop: 12, textAlign: 'center', paddingHorizontal: 24 }}>
              {errorMsg}
            </Text>
            <Pressable
              onPress={() => void loadChildren()}
              style={[
                styles.retryBtn,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : !activeChild ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="bus-alert"
              size={44}
              color={theme.colors.primary}
            />
            <Text
              variant="titleMedium"
              style={{ fontWeight: '700', marginTop: 12 }}
            >
              {t('busTracking.noBusTitle')}
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                marginTop: 6,
                paddingHorizontal: 32,
              }}
            >
              {t('busTracking.noBusSub')}
            </Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={StyleSheet.absoluteFill}
            initialRegion={DEFAULT_REGION}
            showsUserLocation
            showsMyLocationButton
            showsCompass
          >
            {(activeChild.routeStops ?? []).map((s) => (
              <Marker
                key={`stop-${s.id}`}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                title={s.stopName}
              >
                <StopPin
                  isDrop={activeChild.dropStopId === s.id}
                  isPickup={activeChild.pickupStopId === s.id}
                  theme={theme}
                />
              </Marker>
            ))}

            {routeCoords.length >= 2 ? (
              <Polyline
                coordinates={routeCoords}
                strokeColor={theme.colors.primary}
                strokeWidth={4}
                lineDashPattern={[6, 6]}
              />
            ) : null}

            {live?.latitude != null && live?.longitude != null ? (
              <Marker
                coordinate={{
                  latitude: live.latitude,
                  longitude: live.longitude,
                }}
                title={`Bus ${activeChild.busNumber}`}
                rotation={live.headingDeg ?? 0}
              >
                <View
                  style={[
                    styles.busMarker,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <Text style={{ fontSize: 18 }}>🚌</Text>
                </View>
              </Marker>
            ) : null}
          </MapView>
        )}

        {activeChild && (live?.latitude != null || etaKm != null) ? (
          <View
            style={[
              styles.etaBanner,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View style={styles.etaLeft}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={22}
                color={theme.colors.primary}
              />
              <View style={{ marginLeft: 10 }}>
                <Text variant="titleMedium" style={{ fontWeight: '800' }}>
                  {etaMin != null
                    ? t('busTracking.etaMin', { min: etaMin })
                    : '—'}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {etaKm != null
                    ? t('busTracking.etaKm', {
                        km: etaKm,
                        stop:
                          live?.destinationStopName ??
                          activeChild.dropStopName ??
                          t('busTracking.stop'),
                      })
                    : activeChild.activeTripType === 'MORNING'
                      ? t('busTracking.arrivingSchool')
                      : t('busTracking.headingHome')}
                </Text>
              </View>
            </View>
            <View
              style={[styles.pill, { backgroundColor: tripStatus.bg }]}
            >
              <Text
                style={{
                  color: tripStatus.color,
                  fontWeight: '700',
                  fontSize: 11,
                }}
              >
                {tripStatus.label}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {activeChild ? (
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              paddingBottom: insets.bottom + 12,
            },
            sheetExpanded ? { maxHeight: '72%' } : null,
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />
          <Pressable
            onPress={() => setSheetExpanded((v) => !v)}
            style={styles.sheetHeader}
          >
            <View style={{ flex: 1 }}>
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                {t('busTracking.busLine', { number: activeChild.busNumber })}
                {activeChild.vehicleModel
                  ? ` · ${activeChild.vehicleModel}`
                  : ''}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
              >
                {t('busTracking.driverLine', {
                  name:
                    live?.driverName ??
                    activeChild.driverName ??
                    t('busTracking.notAssigned'),
                  mobile:
                    live?.driverMobile ?? activeChild.driverMobile
                      ? ` · ${live?.driverMobile ?? activeChild.driverMobile}`
                      : '',
                })}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={sheetExpanded ? 'chevron-down' : 'chevron-up'}
              size={24}
              color={theme.colors.onSurfaceVariant}
            />
          </Pressable>

          {!sheetExpanded ? (
            <View style={styles.fabRow}>
              <Pressable
                onPress={callDriver}
                style={[
                  styles.callBtn,
                  { backgroundColor: `${theme.colors.success}1A` },
                ]}
              >
                <MaterialCommunityIcons
                  name="phone"
                  size={16}
                  color={theme.colors.success}
                />
                <Text
                  style={{ color: theme.colors.success, fontWeight: '700' }}
                >
                  {t('busTracking.callDriver')}
                </Text>
              </Pressable>
              {activeChild.assistantMobile ? (
                <Pressable
                  onPress={callAssistant}
                  style={[
                    styles.callBtn,
                    { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="phone"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={{ color: theme.colors.primary, fontWeight: '700' }}
                  >
                    {t('busTracking.assistant')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setSheetExpanded(true)}
                style={[
                  styles.callBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <MaterialCommunityIcons
                  name="information-outline"
                  size={16}
                  color={theme.colors.onPrimary}
                />
                <Text
                  style={{ color: theme.colors.onPrimary, fontWeight: '700' }}
                >
                  {t('busTracking.details')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.grid}>
                <InfoCard
                  title={t('busTracking.pickup')}
                  label={activeChild.pickupStopName || '—'}
                  theme={theme}
                />
                <InfoCard
                  title={t('busTracking.drop')}
                  label={activeChild.dropStopName || '—'}
                  theme={theme}
                />
                <InfoCard
                  title={t('busTracking.driver')}
                  label={activeChild.driverName || '—'}
                  sub={activeChild.driverMobile}
                  theme={theme}
                />
                <InfoCard
                  title={t('busTracking.assistant')}
                  label={activeChild.assistantName || '—'}
                  sub={activeChild.assistantMobile}
                  theme={theme}
                />
                <InfoCard
                  title={t('busTracking.class')}
                  label={activeChild.studentClassName || '—'}
                  theme={theme}
                />
                <InfoCard
                  title={t('busTracking.tripType')}
                  label={(activeChild.activeTripType || '—').toLowerCase()}
                  theme={theme}
                />
              </View>

              <Text
                variant="labelMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                }}
              >
                {t('busTracking.routeStops')}
              </Text>
              <View
                style={[
                  styles.stopsBox,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                {(activeChild.routeStops ?? []).length === 0 ? (
                  <Text
                    style={{
                      padding: 14,
                      textAlign: 'center',
                      color: theme.colors.onSurfaceVariant,
                    }}
                  >
                    {t('busTracking.noRoute')}
                  </Text>
                ) : (
                  (activeChild.routeStops ?? []).map((s, i) => (
                    <StopRow
                      key={s.id}
                      stop={s}
                      idx={i + 1}
                      isDrop={activeChild.dropStopId === s.id}
                      isPickup={activeChild.pickupStopId === s.id}
                      theme={theme}
                    />
                  ))
                )}
              </View>
            </ScrollView>
          )}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function StopPin({
  isDrop,
  isPickup,
  theme,
}: {
  isDrop?: boolean;
  isPickup?: boolean;
  theme: AppTheme;
}) {
  const color = isDrop
    ? theme.colors.success
    : isPickup
      ? theme.colors.warning
      : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.stopPin, { backgroundColor: color }]}>
      <MaterialCommunityIcons name="map-marker" size={14} color="#fff" />
    </View>
  );
}

function InfoCard({
  title,
  label,
  sub,
  theme,
}: {
  title: string;
  label: string;
  sub?: string;
  theme: AppTheme;
}) {
  return (
    <View
      style={[
        styles.infoCard,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <Text
        variant="labelSmall"
        style={{
          color: theme.colors.onSurfaceVariant,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={{ fontWeight: '700', marginTop: 4 }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {sub ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
          numberOfLines={1}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function StopRow({
  stop,
  idx,
  isDrop,
  isPickup,
  theme,
}: {
  stop: ParentBusStop;
  idx: number;
  isDrop?: boolean;
  isPickup?: boolean;
  theme: AppTheme;
}) {
  return (
    <View
      style={[
        styles.stopRow,
        { borderBottomColor: theme.colors.outlineVariant },
      ]}
    >
      <View
        style={[
          styles.stopDot,
          {
            backgroundColor: isDrop
              ? theme.colors.success
              : isPickup
                ? theme.colors.warning
                : theme.colors.onSurfaceVariant,
          },
        ]}
      >
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
          {idx}
        </Text>
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ fontWeight: '600' }}>{stop.stopName}</Text>
        {stop.stopAddress ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}
          >
            {stop.stopAddress}
          </Text>
        ) : null}
      </View>
      {stop.latitude != null && stop.longitude != null ? (
        <Pressable
          onPress={() =>
            void Linking.openURL(
              `https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`
            )
          }
          hitSlop={10}
        >
          <MaterialCommunityIcons
            name="navigation-variant"
            size={18}
            color={theme.colors.primary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 4,
  },
  headerText: { flex: 1, marginHorizontal: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 12,
  },
  tab: { alignItems: 'center', marginRight: 12 },
  tabAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapWrap: { flex: 1, position: 'relative' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  etaBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  etaLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 8,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 99,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fabRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 16,
  },
  infoCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  stopsBox: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stopDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  stopPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
