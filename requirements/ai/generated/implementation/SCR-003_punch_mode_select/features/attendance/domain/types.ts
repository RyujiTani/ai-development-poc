export type PunchType = 'CLOCK_IN' | 'CLOCK_OUT';
export type Role = 'FACTORY_ADMIN' | 'CONTRACTOR_MANAGER';

export interface UserSession {
  userId: string;
  role: Role;
}
