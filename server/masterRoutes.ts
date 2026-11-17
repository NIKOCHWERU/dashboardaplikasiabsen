import { Express, Request, Response } from "express";
import { db, pool } from "./db.js";
import { companies, users, shifts, attendance } from "../shared/schema.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { isMasterAdmin } from "./middleware/tenant.js";
import { hashPassword } from "./auth.js";
import { ensureCompanyDriveFolder, isDriveConfigured, uploadFile } from "./services/googleDrive.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function slugifyCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 80);
}

export function registerMasterRoutes(app: Express) {
  // Public endpoint to check if a tenant slug exists (used by TenantApp on load)
  app.get("/api/tenant/:slug", async (req: Request, res: Response) => {
    try {
      const slug = String(req.params.slug).trim().toLowerCase();
      const [company] = await db
        .select()
        .from(companies)
        .where(sql`LOWER(${companies.slug}) = ${slug}`)
        .limit(1);

      if (!company) {
        return res.status(404).json({ message: "PT tidak ditemukan" });
      }
      res.json(company);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Master Dashboard Stats
  app.get("/api/master/stats", isMasterAdmin, async (_req: Request, res: Response) => {
    try {
      const [compStats]: any = await pool.query(`
        SELECT COUNT(*) as totalCompanies, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as activeCompanies
        FROM companies
      `);
      const [empStats]: any = await pool.query(`
        SELECT COUNT(*) as totalEmployees FROM users WHERE role = 'employee'
      `);
      const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];
      const [attStats]: any = await pool.query(
        `SELECT COUNT(DISTINCT user_id) as todayPresent FROM attendance WHERE date = ? AND check_in IS NOT NULL`,
        [today]
      );

      res.json({
        totalCompanies: Number(compStats[0]?.totalCompanies || 0),
        activeCompanies: Number(compStats[0]?.activeCompanies || 0),
        totalEmployees: Number(empStats[0]?.totalEmployees || 0),
        todayPresent: Number(attStats[0]?.todayPresent || 0),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // List all managed companies with stats & main admin username
  app.get("/api/master/companies", isMasterAdmin, async (_req: Request, res: Response) => {
    try {
      const allCompanies = await db.select().from(companies).orderBy(desc(companies.id));
      const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];

      const enriched = await Promise.all(
        allCompanies.map(async (c) => {
          const [empCount]: any = await pool.query(
            `SELECT COUNT(*) as cnt FROM users WHERE company_id = ? AND role = 'employee'`,
            [c.id]
          );
          const [attCount]: any = await pool.query(
            `SELECT COUNT(DISTINCT user_id) as cnt FROM attendance WHERE company_id = ? AND date = ? AND check_in IS NOT NULL`,
            [c.id, today]
          );
          const [superAdmin] = await db
            .select({ id: users.id, username: users.username, fullName: users.fullName })
            .from(users)
            .where(and(eq(users.companyId, c.id), eq(users.role, "superadmin")))
            .limit(1);

          return {
            ...c,
            employeeCount: Number(empCount[0]?.cnt || 0),
            todayAttendanceCount: Number(attCount[0]?.cnt || 0),
            adminUsername: superAdmin?.username || "",
            adminFullName: superAdmin?.fullName || "",
          };
        })
      );

      res.json(enriched);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Create new company (PT)
  app.post("/api/master/companies", isMasterAdmin, async (req: Request, res: Response) => {
    try {
      const {
        name,
        slug: rawSlug,
        shortName,
        logoUrl,
        logoInisial,
        address,
        phone,
        email,
        themePrimary,
        themeSecondary,
        themeAccent,
        themeBackground,
        themeSidebarAccent,
        enableOvertime,
        enableShifts,
        enableLeave,
        enableComplaints,
        enableFakeGpsCheck,
        enablePermitExit,
        enableAnnouncements,
        enableHrActions,
        cutoffStartDay,
        cutoffEndDay,
        isActive,
        adminUsername,
        adminPassword,
        adminFullName,
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Nama PT wajib diisi" });
      }

      const slug = (rawSlug ? slugifyCompanyName(rawSlug) : slugifyCompanyName(name)) || `pt${Date.now()}`;

      const [existing] = await db
        .select()
        .from(companies)
        .where(sql`LOWER(${companies.slug}) = ${slug}`)
        .limit(1);

      if (existing) {
        return res.status(400).json({ message: `Slug "${slug}" sudah digunakan oleh PT lain` });
      }

      // Create Google Drive folder for this PT if Drive is configured
      let driveFolderId: string | null = null;
      if (isDriveConfigured) {
        try {
          driveFolderId = await ensureCompanyDriveFolder(name.trim());
        } catch (driveErr: any) {
          console.warn("Google Drive folder creation skipped:", driveErr.message);
        }
      }

      const [insertResult]: any = await db.insert(companies).values({
        name: name.trim(),
        slug,
        shortName: shortName?.trim() || name.trim(),
        logoUrl: logoUrl || null,
        logoInisial: logoInisial?.trim() || name.trim().charAt(0).toUpperCase(),
        address: address || null,
        phone: phone || null,
        email: email || null,
        themePrimary: themePrimary || "122 39% 49%",
        themeSecondary: themeSecondary || "210 40% 96.1%",
        themeAccent: themeAccent || "210 40% 96.1%",
        themeBackground: themeBackground || "0 0% 100%",
        themeSidebarAccent: themeSidebarAccent || "210 40% 96.1%",
        driveFolderId,
        enableOvertime: enableOvertime ?? true,
        enableShifts: enableShifts ?? true,
        enableLeave: enableLeave ?? true,
        enableComplaints: enableComplaints ?? true,
        enableFakeGpsCheck: enableFakeGpsCheck ?? true,
        enablePermitExit: enablePermitExit ?? true,
        enableAnnouncements: enableAnnouncements ?? true,
        enableHrActions: enableHrActions ?? true,
        cutoffStartDay: Number(cutoffStartDay) || 1,
        cutoffEndDay: Number(cutoffEndDay) || 31,
        isActive: isActive ?? true,
      });

      const companyId = insertResult.insertId;

      // Seed default shifts for this PT
      await db.insert(shifts).values([
        {
          companyId,
          name: "Shift Pagi (Normal)",
          checkInTime: "08:00",
          checkOutTime: "17:00",
          description: "Shift pagi utama senin-jumat",
        },
        {
          companyId,
          name: "Shift Sore",
          checkInTime: "14:00",
          checkOutTime: "22:00",
          description: "Shift sore operasional",
        },
      ]);

      // Create main superadmin user for this PT
      const saUsername = (adminUsername || "superadmin").trim();
      const saPassword = adminPassword && adminPassword.trim() ? adminPassword.trim() : "admin123";
      const passHash = await hashPassword(saPassword);

      await db.insert(users).values({
        companyId,
        username: saUsername,
        password: passHash,
        fullName: (adminFullName || `Admin ${name.trim()}`).trim(),
        role: "superadmin",
        isAdmin: true,
        registrationStatus: "approved",
      });

      const [created] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1);
      res.status(201).json(created);
    } catch (err: any) {
      console.error("Create company error:", err);
      res.status(500).json({ message: err.message || "Gagal menambah PT" });
    }
  });

  // Update company (PT) & optionally reset/update PT superadmin credentials
  app.patch("/api/master/companies/:id", isMasterAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const [existing] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      if (!existing) {
        return res.status(404).json({ message: "PT tidak ditemukan" });
      }

      const {
        name,
        slug: rawSlug,
        shortName,
        logoUrl,
        logoInisial,
        address,
        phone,
        email,
        themePrimary,
        themeSecondary,
        themeAccent,
        themeBackground,
        themeSidebarAccent,
        enableOvertime,
        enableShifts,
        enableLeave,
        enableComplaints,
        enableFakeGpsCheck,
        enablePermitExit,
        enableAnnouncements,
        enableHrActions,
        cutoffStartDay,
        cutoffEndDay,
        isActive,
        adminUsername,
        adminPassword,
        adminFullName,
      } = req.body;

      let newSlug = existing.slug;
      if (rawSlug && slugifyCompanyName(rawSlug) !== existing.slug) {
        newSlug = slugifyCompanyName(rawSlug);
        const [dup] = await db
          .select()
          .from(companies)
          .where(sql`LOWER(${companies.slug}) = ${newSlug} AND ${companies.id} != ${id}`)
          .limit(1);
        if (dup) {
          return res.status(400).json({ message: `Slug "${newSlug}" sudah dipakai PT lain` });
        }
      }

      let driveFolderId = existing.driveFolderId;
      if (!driveFolderId && isDriveConfigured) {
        try {
          driveFolderId = await ensureCompanyDriveFolder((name || existing.name).trim());
        } catch (driveErr: any) {
          console.warn("Google Drive folder creation skipped:", driveErr.message);
        }
      }

      await db
        .update(companies)
        .set({
          name: name !== undefined ? name.trim() : existing.name,
          slug: newSlug,
          shortName: shortName !== undefined ? shortName : existing.shortName,
          logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
          logoInisial: logoInisial !== undefined ? logoInisial : existing.logoInisial,
          address: address !== undefined ? address : existing.address,
          phone: phone !== undefined ? phone : existing.phone,
          email: email !== undefined ? email : existing.email,
          themePrimary: themePrimary !== undefined ? themePrimary : existing.themePrimary,
          themeSecondary: themeSecondary !== undefined ? themeSecondary : existing.themeSecondary,
          themeAccent: themeAccent !== undefined ? themeAccent : existing.themeAccent,
          themeBackground: themeBackground !== undefined ? themeBackground : existing.themeBackground,
          themeSidebarAccent: themeSidebarAccent !== undefined ? themeSidebarAccent : existing.themeSidebarAccent,
          driveFolderId,
          enableOvertime: enableOvertime !== undefined ? enableOvertime : existing.enableOvertime,
          enableShifts: enableShifts !== undefined ? enableShifts : existing.enableShifts,
          enableLeave: enableLeave !== undefined ? enableLeave : existing.enableLeave,
          enableComplaints: enableComplaints !== undefined ? enableComplaints : existing.enableComplaints,
          enableFakeGpsCheck: enableFakeGpsCheck !== undefined ? enableFakeGpsCheck : existing.enableFakeGpsCheck,
          enablePermitExit: enablePermitExit !== undefined ? enablePermitExit : existing.enablePermitExit,
          enableAnnouncements: enableAnnouncements !== undefined ? enableAnnouncements : existing.enableAnnouncements,
          enableHrActions: enableHrActions !== undefined ? enableHrActions : existing.enableHrActions,
          cutoffStartDay: cutoffStartDay !== undefined ? Number(cutoffStartDay) : existing.cutoffStartDay,
          cutoffEndDay: cutoffEndDay !== undefined ? Number(cutoffEndDay) : existing.cutoffEndDay,
          isActive: isActive !== undefined ? isActive : existing.isActive,
        })
        .where(eq(companies.id, id));

      // Update or create main superadmin for this PT if credentials provided
      if (adminUsername || (adminPassword && adminPassword.trim() !== "")) {
        const [superAdmin] = await db
          .select()
          .from(users)
          .where(and(eq(users.companyId, id), eq(users.role, "superadmin")))
          .limit(1);

        if (superAdmin) {
          const updateData: any = {};
          if (adminUsername && adminUsername.trim()) updateData.username = adminUsername.trim();
          if (adminFullName && adminFullName.trim()) updateData.fullName = adminFullName.trim();
          if (adminPassword && adminPassword.trim()) {
            updateData.password = await hashPassword(adminPassword.trim());
          }
          if (Object.keys(updateData).length > 0) {
            await db.update(users).set(updateData).where(eq(users.id, superAdmin.id));
          }
        } else {
          const passHash = await hashPassword(
            adminPassword && adminPassword.trim() ? adminPassword.trim() : "admin123"
          );
          await db.insert(users).values({
            companyId: id,
            username: (adminUsername || "superadmin").trim(),
            password: passHash,
            fullName: (adminFullName || `Admin ${(name || existing.name).trim()}`).trim(),
            role: "superadmin",
            isAdmin: true,
            registrationStatus: "approved",
          });
        }
      }

      const [updated] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      res.json(updated);
    } catch (err: any) {
      console.error("Update company error:", err);
      res.status(500).json({ message: err.message || "Gagal memperbarui PT" });
    }
  });

  // Upload logo for a company
  app.post(
    "/api/master/companies/:id/upload-logo",
    isMasterAdmin,
    upload.single("logo"),
    async (req: Request, res: Response) => {
      try {
        const id = Number(req.params.id);
        const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
        if (!company) return res.status(404).json({ message: "PT tidak ditemukan" });
        if (!req.file) return res.status(400).json({ message: "File logo tidak ditemukan" });

        let logoUrl = "";
        if (isDriveConfigured) {
          try {
            const folderId = await ensureCompanyDriveFolder(company.name, company.driveFolderId);
            if (folderId && !company.driveFolderId) {
              await db.update(companies).set({ driveFolderId: folderId }).where(eq(companies.id, id));
            }
            const ext = path.extname(req.file.originalname) || ".png";
            const fileName = `Logo_${company.slug}_${Date.now()}${ext}`;
            const uploaded = await uploadFile(req.file.buffer, fileName, req.file.mimetype, "Logo", folderId);
            logoUrl = `/absensi/api/gdrive-img/${uploaded.fileId}`;
          } catch (driveErr) {
            console.warn("Drive logo upload failed, falling back to local:", driveErr);
          }
        }

        if (!logoUrl) {
          const uploadDir = path.resolve(process.cwd(), "uploads");
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const ext = path.extname(req.file.originalname) || ".png";
          const fileName = `logo_${company.slug}_${Date.now()}${ext}`;
          fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
          logoUrl = `/absensi/uploads/${fileName}`;
        }

        await db.update(companies).set({ logoUrl }).where(eq(companies.id, id));
        res.json({ logoUrl });
      } catch (err: any) {
        res.status(500).json({ message: err.message || "Gagal upload logo" });
      }
    }
  );

  // Delete company
  app.delete("/api/master/companies/:id", isMasterAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      await pool.query(`DELETE FROM attendance WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM overtimes WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM shifts WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM leave_requests WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM complaints WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM announcements WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM resignations WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM mutations WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM warning_letters WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM system_configs WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM activity_logs WHERE company_id = ?`, [id]);
      await pool.query(`DELETE FROM users WHERE company_id = ?`, [id]);
      await db.delete(companies).where(eq(companies.id, id));
      res.json({ message: "PT dan seluruh datanya berhasil dihapus" });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal menghapus PT" });
    }
  });

  // Impersonate PT Superadmin (View Dashboard directly from Master Dashboard)
  app.post("/api/master/companies/:id/impersonate", isMasterAdmin, async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
      if (!company) return res.status(404).json({ message: "PT tidak ditemukan" });

      let [targetAdmin] = await db
        .select()
        .from(users)
        .where(and(eq(users.companyId, id), eq(users.role, "superadmin")))
        .limit(1);

      if (!targetAdmin) {
        [targetAdmin] = await db
          .select()
          .from(users)
          .where(and(eq(users.companyId, id), eq(users.role, "admin")))
          .limit(1);
      }

      if (!targetAdmin) {
        const passHash = await hashPassword("admin123");
        const [ins]: any = await db.insert(users).values({
          companyId: id,
          username: "superadmin",
          password: passHash,
          fullName: `Admin ${company.name}`,
          role: "superadmin",
          isAdmin: true,
          registrationStatus: "approved",
        });
        const [created] = await db.select().from(users).where(eq(users.id, ins.insertId)).limit(1);
        targetAdmin = created;
      }

      req.logIn(targetAdmin, (err) => {
        if (err) return res.status(500).json({ message: "Gagal masuk ke dashboard PT" });
        res.json({ user: targetAdmin, slug: company.slug });
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Master Admin account settings (admin_nh)
  app.get("/api/master/account", isMasterAdmin, async (req: Request, res: Response) => {
    const u = req.user as any;
    res.json({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
    });
  });

  app.patch("/api/master/account", isMasterAdmin, async (req: Request, res: Response) => {
    try {
      const u = req.user as any;
      const { username, fullName, email, newPassword } = req.body;
      const updateData: any = {};
      if (username && username.trim()) updateData.username = username.trim();
      if (fullName && fullName.trim()) updateData.fullName = fullName.trim();
      if (email !== undefined) updateData.email = email;
      if (newPassword && newPassword.trim()) {
        updateData.password = await hashPassword(newPassword.trim());
      }

      if (Object.keys(updateData).length > 0) {
        await db.update(users).set(updateData).where(eq(users.id, u.id));
      }
      const [updated] = await db.select().from(users).where(eq(users.id, u.id)).limit(1);
      req.logIn(updated, (err) => {
        if (err) return res.status(500).json({ message: "Gagal refresh sesi" });
        res.json({
          id: updated.id,
          username: updated.username,
          fullName: updated.fullName,
          email: updated.email,
        });
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Gagal memperbarui akun" });
    }
  });
}
