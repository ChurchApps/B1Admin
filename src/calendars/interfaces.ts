export interface RoomInterface {
  id?: string;
  churchId?: string;
  name?: string;
  description?: string;
  capacity?: number;
  approvalGroupId?: string;
}

export interface ResourceInterface {
  id?: string;
  churchId?: string;
  name?: string;
  description?: string;
  quantity?: number;
  approvalGroupId?: string;
}

export interface EventBookingInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  roomId?: string;
  resourceId?: string;
  quantity?: number;
  status?: string;
  setupMinutes?: number;
  teardownMinutes?: number;
  startTime?: Date | string;
  endTime?: Date | string;
  requestedBy?: string;
  requestedDate?: Date | string;
  resolvedBy?: string;
  resolvedDate?: Date | string;
  roomName?: string;
  resourceName?: string;
  eventTitle?: string;
  eventStart?: Date | string;
  eventEnd?: Date | string;
  eventRecurrenceRule?: string;
  conflicts?: ConflictInterface[];
}

export interface CalendarBlockoutInterface {
  id?: string;
  churchId?: string;
  roomId?: string;
  resourceId?: string;
  startTime?: Date | string;
  endTime?: Date | string;
  reason?: string;
}

export interface EventTemplateInterface {
  id?: string;
  churchId?: string;
  name?: string;
  title?: string;
  description?: string;
  durationMinutes?: number;
  visibility?: string;
  roomIds?: string;
  resourcesJson?: string;
}

export interface ConflictInterface {
  type: "room" | "resource" | "blockout";
  message: string;
}
