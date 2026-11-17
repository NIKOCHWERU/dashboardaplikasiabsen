import { Request, Response, NextFunction } from "express";
import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "../db.js";
import { companies, Company } from "../../shared/schema.js";
import { sql } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      tenant?: Company;
      companyId?: number;
    }
  }
}

export const tenantStorage = new AsyncLocalStorage<{
  companyId?: number;
  driveFolderId?: string | null;
}>();

export function getCurrentDriveFolderId(): string | null | undefined {
  return tenantStorage.getStore()?.driveFolderId;
}

export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawSlug =
      (req.headers["x-tenant-slug"] as string | undefined) ||
      (req.query.tenant as string | undefined);

    if (rawSlug && typeof rawSlug === "string" && rawSlug.trim() !== "") {
      const normalizedSlug = rawSlug.trim().toLowerCase();
      const [company] = await db
        .select()
        .from(companies)
        .where(sql`LOWER(${companies.slug}) = ${normalizedSlug}`)
        .limit(1);

      if (company) {
        req.tenant = company;
        req.companyId = company.id;
      }
    }
  } catch (err) {
    console.error("Error resolving tenant:", err);
  }

  tenantStorage.run(
    {
      companyId: req.companyId,
      driveFolderId: req.tenant?.driveFolderId ?? null,
    },
    () => next()
  );
}

export function isMasterAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && (req.user as any)?.role === "master_admin") {
    return next();
  }
  res.status(403).json({ message: "Akses ditolak: Khusus Master Admin" });
}

export function getEffectiveCompanyId(req: Request): number {
  if (req.companyId) return req.companyId;
  if ((req.user as any)?.companyId) return Number((req.user as any).companyId);
  return 1;
}
