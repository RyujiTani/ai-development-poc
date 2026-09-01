export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export function writeLog(level: LogLevel, event: string, payload?: Record<string, any>): void {
  const cleanPayload = payload ? { ...payload } : {};

  // Security Constraint: Strictly omit PII and heavy binary payloads from standard logs.
  delete cleanPayload.photo;
  delete cleanPayload.blob;
  delete cleanPayload.password;
  delete cleanPayload.password_hash;
  delete cleanPayload.passwordHash;
  delete cleanPayload.personalInfo;

  console.log(
    JSON.stringify({
      level,
      event,
      payload: cleanPayload,
      timestamp: new Date().toISOString()
    })
  );
}
"
    },
    {