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
const ROUTE_BLUE = '#2563EB';
const ROUTE_BLUE_SOFT = '#93C5FD';
const SCHOOL_PIN = '#4F46E5';
const MY_STOP_GREEN = '#16A34A';
const PICKUP_AMBER = '#D97706';

/** Same pins as admin fleet map */
const BUS_PIN_GREEN = require('../assets/images/bus-pin-green.png');
const BUS_PIN_YELLOW = require('../assets/images/bus-pin-yellow.png');
const BUS_PIN_RED = require('../assets/images/bus-pin-red.png');
const MOVE_SPEED_KMH = 3;
const HOLD_MAX_MS = 2 * 60 * 1000;

type MotionPin = 'green' | 'yellow' | 'red';

function pinImageForMotion(motion: MotionPin) {
  if (motion === 'green') return BUS_PIN_GREEN;
  if (motion === 'yellow') return BUS_PIN_YELLOW;
  return BUS_PIN_RED;
}

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
  const stoppedSinceRef = useRef<number | null>(null);

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
  const [pinPulse, setPinPulse] = useState(1);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      const t = (frame % 24) / 24;
      const wave = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
      setPinPulse(0.62 + 0.38 * wave);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const activeChild = children[activeIdx];
  const busId = activeChild?.busId ?? params.busId;
  const studentId = activeChild?.studentId ?? params.studentId;

  useEffect(() => {
    stoppedSinceRef.current = null;
  }, [busId]);

  const busMotion: MotionPin = useMemo(() => {
    if (!live) return 'red';
    const speed = live.speedKmph;
    const moving = speed != null && speed >= MOVE_SPEED_KMH;
    const onTrip =
      live.activeTripId != null &&
      live.activeTripStatus !== 'COMPLETED' &&
      live.activeTripStatus !== 'CANCELLED';

    if (moving) {
      stoppedSinceRef.current = null;
      return 'green';
    }

    if (!onTrip) {
      stoppedSinceRef.current = null;
      return 'red';
    }

    // On trip, unknown speed + recent GPS → assume moving
    const fresh =
      live.capturedAtMs != null &&
      Date.now() - live.capturedAtMs < 3 * 60 * 1000;
    if (speed == null && fresh) {
      stoppedSinceRef.current = null;
      return 'green';
    }

    // ~0 km/h hold window
    const now = Date.now();
    if (stoppedSinceRef.current == null) stoppedSinceRef.current = now;
    if (now - stoppedSinceRef.current <= HOLD_MAX_MS) return 'yellow';
    return 'red';
  }, [live]);

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
        const tripType =
          res.data.activeTripType ?? activeChild?.activeTripType;
        const morning = tripType !== 'AFTERNOON';
        const targetLat = morning
          ? (activeChild?.pickupStopLat ?? activeChild?.dropStopLat)
          : (activeChild?.dropStopLat ?? activeChild?.pickupStopLat);
        const targetLng = morning
          ? (activeChild?.pickupStopLng ?? activeChild?.dropStopLng)
          : (activeChild?.dropStopLng ?? activeChild?.pickupStopLng);
        if (targetLat != null && targetLng != null) {
          const km = haversineKm(
            res.data.latitude,
            res.data.longitude,
            targetLat,
            targetLng
          );
          setEtaLocal({
            km: Math.round(km * 100) / 100,
            min: Math.max(1, Math.ceil(km * 2)),
          });
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
    activeChild?.activeTripType,
    activeChild?.dropStopLat,
    activeChild?.dropStopLng,
    activeChild?.pickupStopLat,
    activeChild?.pickupStopLng,
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
    const stops = [...(activeChild?.routeStops ?? [])].sort(
      (a, b) => (a.stopOrderIndex ?? 0) - (b.stopOrderIndex ?? 0)
    );
    return stops
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => ({ latitude: s.latitude, longitude: s.longitude }));
  }, [activeChild?.routeStops]);

  /** Live bus → child's target stop (pickup morning / drop afternoon). */
  const remainingPath = useMemo<LatLng[]>(() => {
    if (live?.latitude == null || live?.longitude == null) return [];
    const targetLat =
      live.destinationLat ??
      (live.activeTripType === 'AFTERNOON' ||
      activeChild?.activeTripType === 'AFTERNOON'
        ? (activeChild?.dropStopLat ?? activeChild?.pickupStopLat)
        : (activeChild?.pickupStopLat ?? activeChild?.dropStopLat));
    const targetLng =
      live.destinationLng ??
      (live.activeTripType === 'AFTERNOON' ||
      activeChild?.activeTripType === 'AFTERNOON'
        ? (activeChild?.dropStopLng ?? activeChild?.pickupStopLng)
        : (activeChild?.pickupStopLng ?? activeChild?.dropStopLng));
    if (targetLat == null || targetLng == null) return [];
    return [
      { latitude: live.latitude, longitude: live.longitude },
      { latitude: targetLat, longitude: targetLng },
    ];
  }, [
    activeChild?.activeTripType,
    activeChild?.dropStopLat,
    activeChild?.dropStopLng,
    activeChild?.pickupStopLat,
    activeChild?.pickupStopLng,
    live?.activeTripType,
    live?.destinationLat,
    live?.destinationLng,
    live?.latitude,
    live?.longitude,
  ]);

  const etaDestinationLabel = useMemo(() => {
    if (live?.destinationStopName) return live.destinationStopName;
    const kind = live?.destinationKind;
    const tripType = live?.activeTripType ?? activeChild?.activeTripType;
    const isDrop =
      kind === 'DROP' ||
      (kind == null && tripType === 'AFTERNOON');
    if (isDrop) {
      return (
        activeChild?.dropStopName ??
        activeChild?.pickupStopName ??
        t('busTracking.stop')
      );
    }
    return (
      activeChild?.pickupStopName ??
      activeChild?.dropStopName ??
      t('busTracking.stop')
    );
  }, [
    activeChild?.activeTripType,
    activeChild?.dropStopName,
    activeChild?.pickupStopName,
    live?.activeTripType,
    live?.destinationKind,
    live?.destinationStopName,
    t,
  ]);

  const etaTripHint = useMemo(() => {
    const tripType = live?.activeTripType ?? activeChild?.activeTripType;
    const kind = live?.destinationKind;
    if (kind === 'PICKUP' || (kind == null && tripType !== 'AFTERNOON')) {
      return t('busTracking.arrivingSchool');
    }
    return t('busTracking.headingHome');
  }, [
    activeChild?.activeTripType,
    live?.activeTripType,
    live?.destinationKind,
    t,
  ]);

  // Fit map to full route when stops load / child switches
  useEffect(() => {
    if (routeCoords.length < 1) return;
    const timer = setTimeout(() => {
      try {
        mapRef.current?.fitToCoordinates(
          [
            ...routeCoords,
            ...(live?.latitude != null && live?.longitude != null
              ? [{ latitude: live.latitude, longitude: live.longitude }]
              : []),
          ],
          {
            edgePadding: { top: 80, right: 48, bottom: 180, left: 48 },
            animated: true,
          }
        );
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [activeChild?.assignmentId, routeCoords.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const etaKm = live?.remainingDistanceKm ?? etaLocal?.km;
  const etaKmDisplay =
    etaKm != null ? (Math.round(etaKm * 100) / 100).toFixed(2) : null;
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
            {(activeChild.routeStops ?? []).map((s) => {
              const isMyDrop = activeChild.dropStopId === s.id;
              const isMyPickup = activeChild.pickupStopId === s.id;
              const isSchool = Boolean(s.schoolStop);
              return (
                <Marker
                  key={`stop-${s.id}`}
                  coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                  title={s.stopName}
                  description={
                    isSchool
                      ? 'School'
                      : isMyPickup
                        ? 'Your pickup'
                        : isMyDrop
                          ? 'Your drop'
                          : undefined
                  }
                >
                  <StopPin
                    isSchool={isSchool}
                    isDrop={isMyDrop}
                    isPickup={isMyPickup}
                    theme={theme}
                  />
                </Marker>
              );
            })}

            {/* Full planned route in blue */}
            {routeCoords.length >= 2 ? (
              <Polyline
                coordinates={routeCoords}
                strokeColor={ROUTE_BLUE}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}

            {/* Soft line: live bus → your stop */}
            {remainingPath.length >= 2 ? (
              <Polyline
                coordinates={remainingPath}
                strokeColor={ROUTE_BLUE_SOFT}
                strokeWidth={3}
                lineDashPattern={[8, 6]}
                lineCap="round"
              />
            ) : null}

            {live?.latitude != null && live?.longitude != null ? (
              <Marker
                key={`live-bus-${busMotion}`}
                coordinate={{
                  latitude: live.latitude,
                  longitude: live.longitude,
                }}
                title={`Bus ${activeChild.busNumber}`}
                description={
                  busMotion === 'green'
                    ? 'Moving'
                    : busMotion === 'yellow'
                      ? 'On hold'
                      : 'Stopped'
                }
                image={pinImageForMotion(busMotion)}
                anchor={{ x: 0.5, y: 1 }}
                centerOffset={
                  Platform.OS === 'android' ? { x: 0, y: -2 } : { x: 0, y: 0 }
                }
                opacity={0.55 + 0.45 * ((pinPulse - 0.62) / 0.38)}
                tracksViewChanges={false}
                zIndex={10}
              />
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
                  {etaKmDisplay != null
                    ? t('busTracking.etaKm', {
                        km: etaKmDisplay,
                        stop: etaDestinationLabel,
                      })
                    : etaTripHint}
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
                      isSchool={Boolean(s.schoolStop)}
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
  isSchool,
  theme,
}: {
  isDrop?: boolean;
  isPickup?: boolean;
  isSchool?: boolean;
  theme: AppTheme;
}) {
  const color = isSchool
    ? SCHOOL_PIN
    : isDrop
      ? MY_STOP_GREEN
      : isPickup
        ? PICKUP_AMBER
        : theme.colors.onSurfaceVariant;
  const icon = isSchool
    ? ('school' as const)
    : ('map-marker' as const);
  return (
    <View style={[styles.stopPin, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon} size={14} color="#fff" />
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
  isSchool,
  theme,
}: {
  stop: ParentBusStop;
  idx: number;
  isDrop?: boolean;
  isPickup?: boolean;
  isSchool?: boolean;
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
            backgroundColor: isSchool
              ? SCHOOL_PIN
              : isDrop
                ? MY_STOP_GREEN
                : isPickup
                  ? PICKUP_AMBER
                  : theme.colors.onSurfaceVariant,
          },
        ]}
      >
        {isSchool ? (
          <MaterialCommunityIcons name="school" size={12} color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
            {idx}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={{ fontWeight: '600' }}>
          {stop.stopName}
          {isSchool ? ' · School' : ''}
          {isPickup ? ' · Pickup' : ''}
          {isDrop && !isPickup ? ' · Drop' : ''}
        </Text>
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
            color={ROUTE_BLUE}
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
