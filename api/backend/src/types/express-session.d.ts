// types/express-session.d.ts
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user: { id: string; role: string };
  }
}

declare module 'express' {
  interface Request {
    session: Session & Partial<SessionData>;
  }
}