import { v4 as uuidv4 } from 'uuid';

export const generateRequestId = (): string => uuidv4();

export const REQUEST_ID_HEADER = 'x-request-id';
