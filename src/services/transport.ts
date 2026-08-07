import { api, type ApiEnvelope } from './api';

const prefix = '/clients/transport';

export type BusTripStatusType =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ParentBusStop {
  id: number;
  stopName: string;
  stopAddress?: string;
  latitude: number;
  longitude: number;
  stopOrderIndex: number;
}

export interface ParentChildBus {
  assignmentId: number;
  studentId: number;
  studentName: string;
  studentClassName?: string;
  busId: number;
  busNumber: string;
  vehicleModel?: string;
  driverEmployeeId?: number;
  driverName?: string;
  driverMobile?: string;
  assistantName?: string;
  assistantMobile?: string;
  pickupStopId?: number;
  pickupStopName?: string;
  pickupStopLat?: number;
  pickupStopLng?: number;
  dropStopId?: number;
  dropStopName?: string;
  dropStopLat?: number;
  dropStopLng?: number;
  routeStops: ParentBusStop[];
  activeTripId?: number;
  activeTripType?: 'MORNING' | 'AFTERNOON';
  activeTripStatus?: BusTripStatusType;
  activeTripStartedAtMs?: number;
}

export interface LiveBusLocation {
  busId: number;
  busNumber: string;
  driverEmployeeId?: number;
  driverName?: string;
  driverMobile?: string;
  latitude?: number;
  longitude?: number;
  speedKmph?: number;
  headingDeg?: number;
  accuracyMeters?: number;
  capturedAtMs?: number;
  activeTripId?: number;
  activeTripType?: 'MORNING' | 'AFTERNOON';
  activeTripStatus?: BusTripStatusType;
  remainingDistanceKm?: number;
  estimatedArrivalMinutes?: number;
  destinationStopName?: string;
  destinationLat?: number;
  destinationLng?: number;
}

function unwrapError(error: unknown, fallback: string): Error {
  const err = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };
  return new Error(
    err?.response?.data?.message || err?.message || fallback
  );
}

export async function getParentChildrenBuses(): Promise<
  ApiEnvelope & { data?: ParentChildBus[] }
> {
  try {
    const { data } = await api.get(`${prefix}/parent/children-buses`);
    return data as ApiEnvelope & { data?: ParentChildBus[] };
  } catch (error) {
    throw unwrapError(error, 'Failed to load children buses');
  }
}

export async function getLiveBusLocation(
  busId: number,
  studentId?: number
): Promise<ApiEnvelope & { data?: LiveBusLocation }> {
  try {
    const { data } = await api.get(`${prefix}/live/${busId}`, {
      params: studentId != null ? { studentId } : undefined,
    });
    return data as ApiEnvelope & { data?: LiveBusLocation };
  } catch (error) {
    throw unwrapError(error, 'Failed to load live location');
  }
}
