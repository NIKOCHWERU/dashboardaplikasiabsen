import { google } from 'googleapis';
import { Stream } from 'stream';
import { getCurrentDriveFolderId } from '../middleware/tenant.js';

const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export const isDriveConfigured = !!(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN && ROOT_FOLDER_ID);

if (!isDriveConfigured) {
    console.warn("⚠️  Google Drive credentials not fully configured. Using local file storage fallback.");
} else {
    console.log("✅ Google Drive credentials detected. Drive upload enabled.");
}

const oauth2Client = isDriveConfigured
    ? new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URL || "http://localhost:5000/auth/google/callback"
      )
    : null;

if (oauth2Client && REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
    oauth2Client.on('tokens', (tokens) => {
        if (tokens.refresh_token) {
            console.log('🔄 Google OAuth2: New refresh token received and active.');
        }
        console.log('🔑 Google OAuth2: Access token refreshed automatically.');
    });
}

const drive = oauth2Client ? google.drive({ version: 'v3', auth: oauth2Client }) : null;

// Cache subfolder IDs to avoid repeated lookups: key = `${parentId}:${folderName}`
const subfolderCache: Record<string, string> = {};

// Get or create a company folder inside ROOT_FOLDER_ID
export async function ensureCompanyDriveFolder(companyName: string, existingFolderId?: string | null): Promise<string | null> {
    if (!isDriveConfigured || !drive || !ROOT_FOLDER_ID) return null;
    if (existingFolderId) return existingFolderId;

    await ensureValidToken();

    const safeName = companyName.replace(/'/g, "\\'");
    const res = await drive.files.list({
        q: `'${ROOT_FOLDER_ID}' in parents and name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
    });

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!;
    }

    const created = await drive.files.create({
        requestBody: {
            name: companyName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [ROOT_FOLDER_ID],
        },
        fields: 'id',
    });

    const folderId = created.data.id!;
    console.log(`📁 Google Drive: Created company folder "${companyName}" (${folderId})`);
    return folderId;
}

// Get or create a subfolder inside parentFolderId (defaults to ROOT_FOLDER_ID)
async function getOrCreateSubfolder(folderName: DriveFolder, parentFolderId?: string | null): Promise<string> {
    const parentId = parentFolderId || ROOT_FOLDER_ID;
    if (!drive || !parentId) throw new Error("Drive not configured");

    const cacheKey = `${parentId}:${folderName}`;
    if (subfolderCache[cacheKey]) return subfolderCache[cacheKey];

    // Search for existing subfolder
    const res = await drive.files.list({
        q: `'${parentId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
        pageSize: 1,
    });

    if (res.data.files && res.data.files.length > 0) {
        const folderId = res.data.files[0].id!;
        subfolderCache[cacheKey] = folderId;
        return folderId;
    }

    // Create the subfolder
    const created = await drive.files.create({
        requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId],
        },
        fields: 'id',
    });

    const folderId = created.data.id!;
    console.log(`📁 Google Drive: Created subfolder "${folderName}" in parent ${parentId} (${folderId})`);
    subfolderCache[cacheKey] = folderId;
    return folderId;
}

let hasLoggedRefreshTokenError = false;

// Ensure access token is valid before uploading
async function ensureValidToken(): Promise<void> {
    if (!oauth2Client) return;
    try {
        const tokenInfo = await oauth2Client.getAccessToken();
        if (!tokenInfo.token) {
            throw new Error("Failed to get access token");
        }
        hasLoggedRefreshTokenError = false;
    } catch (error: any) {
        if (!hasLoggedRefreshTokenError) {
            console.warn("⚠️ Google OAuth2 token error (invalid_grant): Refresh token expired or revoked. Falling back to local disk storage.");
            hasLoggedRefreshTokenError = true;
        }
        throw new Error("Google Drive authentication failed. The refresh token may be expired.");
    }
}

// Build readable filename based on action type
export function buildDriveFilename(
    fullName: string,
    actionType: 'clockIn' | 'breakStart' | 'breakEnd' | 'clockOut' | 'lateReason' | 'complaint' | 'document' | 'profile' | 'overtimeSPL' | 'overtimeInitial' | 'overtimeFinal',
    docLabel?: string // e.g. "KTP", "NPWP", "BPJS", "Profil"
): string {
    const cleanName = fullName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
    const now = new Date();
    // Jakarta time (UTC+7)
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const date = wib.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = wib.toISOString().split('T')[1].substring(0, 8).replace(/:/g, '-'); // HH-MM-SS

    const actionMap: Record<string, string> = {
        clockIn: 'AbsenMasuk',
        breakStart: 'MulaiIstirahat',
        breakEnd: 'SelesaiIstirahat',
        clockOut: 'AbsenPulang',
        lateReason: 'AlasanTerlambat',
        complaint: 'Pengaduan',
        document: docLabel ? `Dokumen_${docLabel}` : 'Dokumen',
        profile: 'FotoProfil',
        overtimeSPL: 'SuratPerintahLembur_SPL',
        overtimeInitial: 'FotoAwalLembur',
        overtimeFinal: 'DokumentasiHasilLembur',
    };

    const action = actionMap[actionType] || actionType;
    return `${cleanName}_${date}_${action}_${timeStr}.jpg`;
}

export type DriveFolder = 'Absensi' | 'Dokumen' | 'Pengaduan' | 'Lembur' | 'Logo';

export async function uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: DriveFolder = 'Dokumen',
    companyFolderId?: string | null
): Promise<{ fileId: string; viewUrl: string }> {
    if (!isDriveConfigured || !drive) {
        throw new Error("Google Drive is not configured");
    }

    await ensureValidToken();

    const resolvedCompanyFolder = companyFolderId ?? getCurrentDriveFolderId();
    const folderId = await getOrCreateSubfolder(folder, resolvedCompanyFolder);

    const bufferStream = new Stream.PassThrough();
    bufferStream.end(fileBuffer);

    try {
        const response = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
                mimeType: mimeType,
            },
            media: {
                mimeType: mimeType,
                body: bufferStream,
            },
            fields: 'id, webViewLink',
        });

        // Make file public
        await drive.permissions.create({
            fileId: response.data.id!,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log(`✅ Google Drive [${folder}]: ${fileName}`);

        return {
            fileId: response.data.id!,
            viewUrl: response.data.webViewLink || ""
        };
    } catch (error: any) {
        const statusCode = error?.response?.status;
        const errorMsg = error?.response?.data?.error || error?.message || "Unknown error";

        if (statusCode === 401) {
            console.error("❌ Google Drive: 401 Unauthorized — refresh token may be expired.");
        } else {
            console.error(`❌ Google Drive Upload Error [${statusCode}]:`, errorMsg);
        }

        throw new Error("Failed to upload file to Google Drive");
    }
}

export async function listFiles(): Promise<{ id: string; name: string; webViewLink?: string }[]> {
    if (!isDriveConfigured || !drive) {
        throw new Error("Google Drive is not configured");
    }
    await ensureValidToken();
    try {
        const response = await drive.files.list({
            q: `'${ROOT_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, webViewLink)',
            pageSize: 1000
        });
        return (response.data.files || []) as any;
    } catch (error: any) {
        console.error("❌ Google Drive List Error:", error.message);
        throw new Error("Failed to list files from Google Drive");
    }
}

export async function downloadFileStream(fileId: string): Promise<Stream> {
    if (!isDriveConfigured || !drive) {
        throw new Error("Google Drive is not configured");
    }
    await ensureValidToken();
    try {
        const response = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        return response.data;
    } catch (error: any) {
        console.error("❌ Google Drive Download Error:", error.message);
        throw error;
    }
}
