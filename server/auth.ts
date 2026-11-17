import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
// @ts-ignore
import MySQLStore from "express-mysql-session";
import crypto from "crypto";
import { Express, Request, Response, NextFunction } from "express";
import { db, pool } from "./db.js";
import { users } from "../shared/schema.js";
import { eq, and, or } from "drizzle-orm";

const { scrypt, randomBytes } = crypto;

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = hash.split(":");
    if (parts.length !== 2) return resolve(false);
    const [salt, key] = parts;
    scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(derivedKey.toString("hex") === key);
    });
  });
}

export function setupAuth(app: Express) {
  // Use MySQL for session storage
  const SessionStore = (MySQLStore as any)(session);
  const sessionStore = new SessionStore({
    expiration: 30 * 24 * 60 * 60 * 1000, // 30 hari
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
  }, pool as any);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "fallback-secret-key-abc",
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      proxy: true,
      cookie: {
        secure: "auto", // Otomatis aktifkan secure flag jika berjalan di balik reverse proxy HTTPS
        sameSite: "lax",
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 hari
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { passReqToCallback: true },
      async (req: Request, username: string, password: string, done) => {
        try {
          let user: any;

          if (req.tenant) {
            // Tenant-scoped login (admin, superadmin, or employee of this PT)
            if (!req.tenant.isActive) {
              return done(null, false, { message: "Perusahaan sedang dinonaktifkan" });
            }
            const [found] = await db
              .select()
              .from(users)
              .where(
                and(
                  eq(users.companyId, req.tenant.id),
                  or(eq(users.username, username), eq(users.nik, username))
                )
              )
              .limit(1);
            user = found;
          } else {
            // Master Dashboard login (master_admin only)
            const [found] = await db
              .select()
              .from(users)
              .where(
                and(
                  eq(users.role, "master_admin"),
                  eq(users.username, username)
                )
              )
              .limit(1);
            user = found;
          }

          if (!user) {
            return done(null, false, { message: "Username atau NIK tidak ditemukan" });
          }

          // Employee password check is bypassed (NIK-only login)
          if (user.role === "employee") {
            return done(null, user);
          }

          // Master Admin, Admins and Superadmins require password check
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Kata sandi salah" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  // API Endpoints for Auth
  app.post("/api/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("Login authenticate error:", err);
        return res.status(500).json({ message: err.message || "Terjadi kesalahan saat login" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Login gagal" });
      }
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          console.error("req.logIn error:", loginErr);
          return res.status(500).json({ message: loginErr.message || "Gagal membuat sesi login" });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout gagal" });
      req.session.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logout berhasil" });
      });
    });
  });

  app.get("/api/user", (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Belum masuk" });
    }
    const u = req.user as any;
    // If accessing a specific PT context, ensure session user belongs to that PT
    if (req.tenant && u.companyId !== req.tenant.id) {
      return res.status(401).json({ message: "Sesi tidak sesuai dengan PT ini" });
    }
    // If accessing Master Dashboard (no tenant header), only master_admin is valid
    if (!req.tenant && u.role !== "master_admin" && req.headers["x-master-context"] === "true") {
      return res.status(401).json({ message: "Bukan sesi Master Admin" });
    }
    res.json(u);
  });
}

// Middlewares
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Silakan login terlebih dahulu" });
  }
  const u = req.user as any;
  if (req.tenant && u.role !== "master_admin" && u.companyId !== req.tenant.id) {
    return res.status(403).json({ message: "Akses ditolak: User bukan bagian dari PT ini" });
  }
  return next();
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && ["admin", "superadmin"].includes((req.user as any).role)) {
    const u = req.user as any;
    if (req.tenant && u.companyId !== req.tenant.id) {
      return res.status(403).json({ message: "Akses ditolak: Bukan admin PT ini" });
    }
    return next();
  }
  res.status(403).json({ message: "Akses ditolak: Khusus Admin" });
}

export function isSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as any).role === "superadmin") {
    const u = req.user as any;
    if (req.tenant && u.companyId !== req.tenant.id) {
      return res.status(403).json({ message: "Akses ditolak: Bukan superadmin PT ini" });
    }
    return next();
  }
  res.status(403).json({ message: "Akses ditolak: Khusus Superadmin" });
}
