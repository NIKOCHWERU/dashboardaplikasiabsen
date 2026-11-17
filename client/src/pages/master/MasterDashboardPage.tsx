import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MasterLayout from "./MasterLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { hexToHslString, hslStringToHex, resolveAssetUrl } from "@/lib/tenant";
import {
  Building2,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Edit,
  Trash2,
  Users,
  CheckCircle2,
  CalendarRange,
  Shield,
  Palette,
  Sliders,
  KeyRound,
  Upload,
  Loader2,
  LayoutDashboard,
  FolderCheck,
} from "lucide-react";

interface CompanyItem {
  id: number;
  name: string;
  slug: string;
  shortName: string | null;
  logoUrl: string | null;
  logoInisial: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  themePrimary: string | null;
  driveFolderId: string | null;
  enableOvertime: boolean;
  enableShifts: boolean;
  enableLeave: boolean;
  enableComplaints: boolean;
  enableFakeGpsCheck: boolean;
  enablePermitExit: boolean;
  enableAnnouncements: boolean;
  enableHrActions: boolean;
  cutoffStartDay: number;
  cutoffEndDay: number;
  isActive: boolean;
  employeeCount?: number;
  todayAttendanceCount?: number;
  adminUsername?: string;
  adminFullName?: string;
}

const COLOR_PRESETS = [
  { label: "Hijau Emerald", hex: "#16a34a" },
  { label: "Biru Korporat", hex: "#2563eb" },
  { label: "Emas Premium", hex: "#d97706" },
  { label: "Oranye Energi", hex: "#f97316" },
  { label: "Ungu Modern", hex: "#7c3aed" },
  { label: "Merah Tegas", hex: "#dc2626" },
];

function slugifyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80);
}

export default function MasterDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyItem | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [impersonatingId, setImpersonatingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    slugManual: false,
    shortName: "",
    logoUrl: "",
    logoInisial: "",
    address: "",
    phone: "",
    email: "",
    colorHex: "#16a34a",
    isActive: true,
    adminUsername: "superadmin",
    adminFullName: "",
    adminPassword: "",
    enableOvertime: true,
    enableShifts: true,
    enableLeave: true,
    enableComplaints: true,
    enableFakeGpsCheck: true,
    enablePermitExit: true,
    enableAnnouncements: true,
    enableHrActions: true,
    cutoffStartDay: 25,
    cutoffEndDay: 25,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/master/stats"],
  });

  const { data: companiesList = [], isLoading } = useQuery<CompanyItem[]>({
    queryKey: ["/api/master/companies"],
  });

  const openAddModal = () => {
    setEditingCompany(null);
    setLogoFile(null);
    setLogoPreview("");
    setForm({
      name: "",
      slug: "",
      slugManual: false,
      shortName: "",
      logoUrl: "",
      logoInisial: "",
      address: "",
      phone: "",
      email: "",
      colorHex: "#16a34a",
      isActive: true,
      adminUsername: "superadmin",
      adminFullName: "",
      adminPassword: "",
      enableOvertime: true,
      enableShifts: true,
      enableLeave: true,
      enableComplaints: true,
      enableFakeGpsCheck: true,
      enablePermitExit: true,
      enableAnnouncements: true,
      enableHrActions: true,
      cutoffStartDay: 25,
      cutoffEndDay: 25,
    });
    setModalOpen(true);
  };

  const openEditModal = (c: CompanyItem) => {
    setEditingCompany(c);
    setLogoFile(null);
    setLogoPreview(c.logoUrl || "");
    setForm({
      name: c.name,
      slug: c.slug,
      slugManual: true,
      shortName: c.shortName || c.name,
      logoUrl: c.logoUrl || "",
      logoInisial: c.logoInisial || c.name.charAt(0).toUpperCase(),
      address: c.address || "",
      phone: c.phone || "",
      email: c.email || "",
      colorHex: hslStringToHex(c.themePrimary),
      isActive: c.isActive,
      adminUsername: c.adminUsername || "superadmin",
      adminFullName: c.adminFullName || "",
      adminPassword: "",
      enableOvertime: c.enableOvertime,
      enableShifts: c.enableShifts,
      enableLeave: c.enableLeave,
      enableComplaints: c.enableComplaints,
      enableFakeGpsCheck: c.enableFakeGpsCheck,
      enablePermitExit: c.enablePermitExit,
      enableAnnouncements: c.enableAnnouncements,
      enableHrActions: c.enableHrActions,
      cutoffStartDay: c.cutoffStartDay || 1,
      cutoffEndDay: c.cutoffEndDay || 31,
    });
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug || slugifyName(form.name),
        shortName: form.shortName || form.name,
        logoUrl: form.logoUrl || null,
        logoInisial: form.logoInisial || form.name.charAt(0).toUpperCase(),
        address: form.address,
        phone: form.phone,
        email: form.email,
        themePrimary: hexToHslString(form.colorHex),
        isActive: form.isActive,
        adminUsername: form.adminUsername,
        adminFullName: form.adminFullName,
        adminPassword: form.adminPassword || undefined,
        enableOvertime: form.enableOvertime,
        enableShifts: form.enableShifts,
        enableLeave: form.enableLeave,
        enableComplaints: form.enableComplaints,
        enableFakeGpsCheck: form.enableFakeGpsCheck,
        enablePermitExit: form.enablePermitExit,
        enableAnnouncements: form.enableAnnouncements,
        enableHrActions: form.enableHrActions,
        cutoffStartDay: Number(form.cutoffStartDay) || 1,
        cutoffEndDay: Number(form.cutoffEndDay) || 31,
      };

      const url = editingCompany
        ? `/api/master/companies/${editingCompany.id}`
        : "/api/master/companies";
      const method = editingCompany ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menyimpan data PT");
      }
      const saved: CompanyItem = await res.json();

      if (logoFile && saved?.id) {
        const fd = new FormData();
        fd.append("logo", logoFile);
        const upRes = await fetch(`/api/master/companies/${saved.id}/upload-logo`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        if (!upRes.ok) {
          toast({
            title: "PT tersimpan, namun upload logo gagal",
            variant: "destructive",
          });
        }
      }

      return saved;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master/stats"] });
      setModalOpen(false);
      toast({
        title: editingCompany ? "PT Berhasil Diperbarui" : "PT Baru Berhasil Ditambahkan",
        description: "Pengaturan domain, branding, dan folder Google Drive telah disinkronkan.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Gagal Menyimpan",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/master/companies/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal menghapus PT");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master/companies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/master/stats"] });
      toast({ title: "PT berhasil dihapus" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal menghapus", description: err.message, variant: "destructive" });
    },
  });

  const handleViewDashboard = async (c: CompanyItem) => {
    try {
      setImpersonatingId(c.id);
      const res = await fetch(`/api/master/companies/${c.id}/impersonate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal membuka dashboard PT");
      }
      window.location.href = `/absensi/${c.slug}/admin/dashboard`;
    } catch (err: any) {
      toast({
        title: "Gagal Membuka Dashboard",
        description: err.message,
        variant: "destructive",
      });
      setImpersonatingId(null);
    }
  };

  const copyUrl = (path: string) => {
    const full = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(full);
    toast({ title: "URL disalin", description: full });
  };

  const filteredCompanies = companiesList.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()) ||
      (c.address || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <MasterLayout title="Daftar &amp; Pengelolaan PT">
      <div className="space-y-6">
        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-amber-200/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total PT Dikelola</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.totalCompanies ?? companiesList.length}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">PT Status Aktif</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {stats?.activeCompanies ?? companiesList.filter((c) => c.isActive).length}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Total Karyawan (Semua PT)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.totalEmployees ?? 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-amber-200/70 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">Hadir Hari Ini</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  {stats?.todayPresent ?? 0}
                </p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                <CalendarRange className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-2xl border border-amber-200/70 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama PT, slug, atau alamat..."
              className="pl-10 bg-white border-amber-200/80 focus:border-amber-500 normal-case"
            />
          </div>

          <Button
            onClick={openAddModal}
            className="bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md shadow-amber-500/20 normal-case"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah PT Baru
          </Button>
        </div>

        {/* Companies List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-amber-200/70 p-12 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-600" />
            Memuat daftar PT...
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-2xl border border-amber-200/70 p-12 text-center">
            <Building2 className="w-10 h-10 text-amber-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Belum ada PT yang sesuai</p>
            <p className="text-xs text-slate-500 mt-1">
              Klik "Tambah PT Baru" untuk membuat tenant absensi baru.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCompanies.map((c) => {
              const adminPath = `/absensi/${c.slug}/admin`;
              const empPath = `/absensi/${c.slug}/karyawan`;
              const themeHex = hslStringToHex(c.themePrimary);

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 overflow-hidden border border-slate-200"
                          style={{ backgroundColor: c.logoUrl ? "#ffffff" : themeHex }}
                        >
                          {c.logoUrl ? (
                            <img
                              src={resolveAssetUrl(c.logoUrl)}
                              alt={c.name}
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            c.logoInisial || c.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900 truncate normal-case">
                              {c.name}
                            </h3>
                            <Badge
                              variant={c.isActive ? "default" : "secondary"}
                              className={
                                c.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                                  : "bg-slate-100 text-slate-500"
                              }
                            >
                              {c.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5 normal-case">
                            {c.address || "Alamat belum diatur"}
                          </p>
                        </div>
                      </div>

                      <div
                        className="w-5 h-5 rounded-full border border-slate-200 shrink-0"
                        style={{ backgroundColor: themeHex }}
                        title="Warna Tema PT"
                      />
                    </div>

                    {/* Domain Paths */}
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium shrink-0">Admin:</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code className="text-[11px] text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200/70 truncate">
                            {adminPath}
                          </code>
                          <button
                            onClick={() => copyUrl(adminPath)}
                            className="p-1 text-slate-400 hover:text-amber-700"
                            title="Salin URL Admin"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={adminPath}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-amber-700"
                            title="Buka URL Admin"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-medium shrink-0">Karyawan:</span>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <code className="text-[11px] text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200/70 truncate">
                            {empPath}
                          </code>
                          <button
                            onClick={() => copyUrl(empPath)}
                            className="p-1 text-slate-400 hover:text-amber-700"
                            title="Salin URL Karyawan"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={empPath}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-400 hover:text-amber-700"
                            title="Buka URL Karyawan"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Features */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                        <Users className="w-3.5 h-3.5 text-amber-600" />
                        {c.employeeCount ?? 0} Karyawan ({c.todayAttendanceCount ?? 0} Hadir)
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                        <CalendarRange className="w-3.5 h-3.5 text-amber-600" />
                        Cutoff: Tgl {c.cutoffStartDay} - {c.cutoffEndDay}
                      </span>
                      {c.driveFolderId && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium">
                          <FolderCheck className="w-3.5 h-3.5" />
                          GDrive Synced
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {c.enableOvertime && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800 bg-amber-50/40">
                          Lembur
                        </Badge>
                      )}
                      {c.enableShifts && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800 bg-amber-50/40">
                          Shift
                        </Badge>
                      )}
                      {c.enableLeave && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800 bg-amber-50/40">
                          Cuti
                        </Badge>
                      )}
                      {c.enableComplaints && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800 bg-amber-50/40">
                          Pengaduan
                        </Badge>
                      )}
                      {c.enableFakeGpsCheck && (
                        <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800 bg-amber-50/40">
                          Anti Fake GPS
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-[11px] text-slate-500">
                      Admin Utama: <strong className="text-slate-800">{c.adminUsername || "-"}</strong>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(c)}
                        className="border-amber-200 text-amber-900 hover:bg-amber-50 normal-case"
                      >
                        <Edit className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleViewDashboard(c)}
                        disabled={impersonatingId === c.id}
                        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-sm normal-case"
                      >
                        {impersonatingId === c.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        View Dashboard
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm(
                              `Yakin ingin menghapus "${c.name}" beserta seluruh data karyawan & absensinya?`
                            )
                          ) {
                            deleteMutation.mutate(c.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                        title="Hapus PT"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit PT Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white normal-case">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2 normal-case">
              <Building2 className="w-5 h-5 text-amber-600" />
              {editingCompany ? `Edit PT: ${editingCompany.name}` : "Tambah PT (Perusahaan) Baru"}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="profil" className="mt-2">
            <TabsList className="grid grid-cols-4 bg-amber-50/70 border border-amber-200/70">
              <TabsTrigger value="profil" className="text-xs data-[state=active]:bg-white data-[state=active]:text-amber-900">
                <Palette className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Profil &amp; Warna
              </TabsTrigger>
              <TabsTrigger value="admin" className="text-xs data-[state=active]:bg-white data-[state=active]:text-amber-900">
                <KeyRound className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Admin Utama
              </TabsTrigger>
              <TabsTrigger value="fitur" className="text-xs data-[state=active]:bg-white data-[state=active]:text-amber-900">
                <Sliders className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Fitur Modul
              </TabsTrigger>
              <TabsTrigger value="cutoff" className="text-xs data-[state=active]:bg-white data-[state=active]:text-amber-900">
                <CalendarRange className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Periode Cutoff
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Profil & Branding */}
            <TabsContent value="profil" className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nama PT *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name: val,
                        slug: prev.slugManual ? prev.slug : slugifyName(val),
                        shortName: prev.shortName || val,
                      }));
                    }}
                    placeholder="Contoh: PT Agung Sejati"
                    className="normal-case"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Path Domain (Slug)</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        slug: slugifyName(e.target.value),
                        slugManual: true,
                      }))
                    }
                    placeholder="ptagungsejati"
                    className="normal-case font-mono text-xs"
                  />
                  <p className="text-[11px] text-amber-700">
                    URL: /absensi/<strong>{form.slug || "namapt"}</strong>/admin &amp; /karyawan
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Singkatan PT</Label>
                  <Input
                    value={form.shortName}
                    onChange={(e) => setForm({ ...form, shortName: e.target.value })}
                    placeholder="PT Agung Sejati"
                    className="normal-case"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Inisial Logo</Label>
                  <Input
                    value={form.logoInisial}
                    maxLength={4}
                    onChange={(e) => setForm({ ...form, logoInisial: e.target.value })}
                    placeholder="AS"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Status PT</Label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                    />
                    <span className="text-xs font-medium">
                      {form.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Logo Perusahaan</Label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-center overflow-hidden shrink-0">
                    {logoPreview ? (
                      <img src={resolveAssetUrl(logoPreview)} alt="Preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="w-6 h-6 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 text-amber-900 text-xs font-medium cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      Upload File Logo
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setLogoFile(f);
                            setLogoPreview(URL.createObjectURL(f));
                          }
                        }}
                      />
                    </label>
                    <Input
                      value={form.logoUrl}
                      onChange={(e) => {
                        setForm({ ...form, logoUrl: e.target.value });
                        setLogoPreview(e.target.value);
                      }}
                      placeholder="Atau tempel URL logo..."
                      className="text-xs h-8 normal-case"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Color */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Warna Tema Utama PT</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <input
                    type="color"
                    value={form.colorHex}
                    onChange={(e) => setForm({ ...form, colorHex: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setForm({ ...form, colorHex: p.hex })}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-medium border flex items-center gap-1.5 ${
                          form.colorHex.toLowerCase() === p.hex.toLowerCase()
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: p.hex }}
                        />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Alamat Lengkap PT</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Jl. Sudirman No. 123, Jakarta"
                  className="normal-case"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nomor Telepon</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="021-xxxxxxx"
                    className="normal-case"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Email Perusahaan</Label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="hrd@perusahaan.com"
                    className="normal-case"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Admin Utama PT */}
            <TabsContent value="admin" className="space-y-4 pt-4">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Pengaturan akun <strong>Superadmin Utama</strong> untuk PT ini. Jika admin PT lupa
                  kata sandi atau username, Anda dapat meresetnya langsung dari sini.
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Username Admin Utama</Label>
                <Input
                  value={form.adminUsername}
                  onChange={(e) => setForm({ ...form, adminUsername: e.target.value })}
                  placeholder="superadmin"
                  className="normal-case"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nama Lengkap Admin</Label>
                <Input
                  value={form.adminFullName}
                  onChange={(e) => setForm({ ...form, adminFullName: e.target.value })}
                  placeholder="Admin HRD PT"
                  className="normal-case"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {editingCompany ? "Password Baru (Kosongkan jika tidak diubah)" : "Password Admin Utama"}
                </Label>
                <Input
                  type="password"
                  value={form.adminPassword}
                  onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                  placeholder={editingCompany ? "Isi untuk reset password..." : "Default: admin123"}
                  className="normal-case"
                />
              </div>
            </TabsContent>

            {/* Tab 3: Fitur & Modul */}
            <TabsContent value="fitur" className="space-y-3 pt-4">
              {[
                {
                  key: "enableOvertime",
                  label: "Fitur Lembur (SPL & Dokumentasi Lembur)",
                  desc: "Mengaktifkan pengajuan, persetujuan, dan rekap lembur karyawan.",
                },
                {
                  key: "enableShifts",
                  label: "Fitur Shift Karyawan",
                  desc: "Mengaktifkan manajemen jadwal shift pagi/sore/malam.",
                },
                {
                  key: "enableLeave",
                  label: "Fitur Cuti Karyawan",
                  desc: "Mengaktifkan pengajuan cuti dan kuota cuti tahunan.",
                },
                {
                  key: "enableComplaints",
                  label: "Fitur Pengaduan / Tiket",
                  desc: "Karyawan dapat mengirim pengaduan atau kendala ke admin.",
                },
                {
                  key: "enablePermitExit",
                  label: "Fitur Izin Keluar Tengah Jam Kerja",
                  desc: "Mengizinkan karyawan mencatat izin keluar sementara & kembali bekerja.",
                },
                {
                  key: "enableFakeGpsCheck",
                  label: "Deteksi Fake GPS",
                  desc: "Menandai absensi yang terindikasi menggunakan lokasi palsu.",
                },
                {
                  key: "enableAnnouncements",
                  label: "Papan Informasi & Pengumuman",
                  desc: "Admin dapat mempublikasikan pengumuman untuk karyawan.",
                },
                {
                  key: "enableHrActions",
                  label: "Fitur HR (Mutasi, Surat Peringatan, Resign)",
                  desc: "Mengaktifkan pengelolaan mutasi/promosi, SP1-SP3, dan resign.",
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-200 bg-white"
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                  <Switch
                    checked={(form as any)[item.key]}
                    onCheckedChange={(v) => setForm({ ...form, [item.key]: v })}
                  />
                </div>
              ))}
            </TabsContent>

            {/* Tab 4: Periode Cutoff Bulanan */}
            <TabsContent value="cutoff" className="space-y-4 pt-4">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                Atur rentang tanggal penarikan data rekap absensi bulanan (cutoff payroll). Contoh:
                Tanggal <strong>25</strong> bulan sebelumnya s/d Tanggal <strong>25</strong> bulan
                berjalan (misal 25 Maret - 25 April).
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tanggal Mulai Cutoff (1-31)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.cutoffStartDay}
                    onChange={(e) =>
                      setForm({ ...form, cutoffStartDay: Number(e.target.value) || 1 })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Tanggal Akhir Cutoff (1-31)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={form.cutoffEndDay}
                    onChange={(e) =>
                      setForm({ ...form, cutoffEndDay: Number(e.target.value) || 31 })
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)} className="normal-case">
              Batal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.name.trim()}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white normal-case"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : editingCompany ? (
                "Simpan Perubahan"
              ) : (
                "Buat PT &amp; Sinkronkan Drive"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MasterLayout>
  );
}
