import { Route, Switch, Redirect, Router, useLocation } from "wouter";
import { AuthProvider, useAuth } from "./hooks/use-auth.js";
import { Toaster } from "./components/ui/toaster.js";
import { TooltipProvider } from "./components/ui/tooltip.js";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTenantSlugFromPath } from "./lib/tenant.js";

// Master Admin Pages
import MasterLoginPage from "./pages/master/MasterLoginPage.js";
import MasterDashboardPage from "./pages/master/MasterDashboardPage.js";
import MasterSettingsPage from "./pages/master/MasterSettingsPage.js";

// Tenant Page imports
import LoginPage from "./pages/LoginPage.js";
import AdminLoginPage from "./pages/admin/AdminLoginPage.js";
import SignupPage from "./pages/employee/SignupPage.js";
import StatusPendingPage from "./pages/employee/StatusPendingPage.js";
import EmployeeDashboard from "./pages/employee/DashboardPage.js";
import LeavePage from "./pages/employee/LeavePage.js";
import RecapPage from "./pages/employee/RecapPage.js";
import ComplaintPage from "./pages/employee/ComplaintPage.js";
import ProfilePage from "./pages/employee/ProfilePage.js";
import InfoPage from "./pages/employee/InfoPage.js";
import RegistrationPage from "./pages/employee/RegistrationPage.js";
import DocumentsPage from "./pages/employee/DocumentsPage.js";
import AdminOvertimePage from "./pages/admin/AdminOvertimePage.js";
import AdminOvertimeHistoryPage from "./pages/admin/AdminOvertimeHistoryPage.js";
import AdminDashboard from "./pages/admin/DashboardPage.js";
import EmployeeListPage from "./pages/admin/EmployeeListPage.js";
import AttendanceHistoryPage from "./pages/admin/AttendanceHistoryPage.js";
import AdminRecapPage from "./pages/admin/RecapPage.js";
import AttendanceSummaryPage from "./pages/admin/AttendanceSummaryPage.js";
import AdminVerificationPage from "./pages/admin/AdminVerificationPage.js";
import AdminLeavePage from "./pages/admin/AdminLeavePage.js";
import AdminLeaveHistoryPage from "./pages/admin/AdminLeaveHistoryPage.js";
import AdminLeaveQuotaPage from "./pages/admin/AdminLeaveQuotaPage.js";
import MutationManagementPage from "./pages/admin/MutationManagementPage.js";
import MutationHistoryPage from "./pages/admin/MutationHistoryPage.js";
import WarningLetterManagementPage from "./pages/admin/WarningLetterManagementPage.js";
import AdminShiftPage from "./pages/admin/AdminShiftPage.js";
import AdminManageAdminsPage from "./pages/admin/AdminManageAdminsPage.js";
import AdminProfilePage from "./pages/admin/AdminProfilePage.js";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage.js";
import BackupPage from "./pages/admin/BackupPage.js";
import InfoBoardPage from "./pages/admin/InfoBoardPage.js";
import ActivityLogsPage from "./pages/admin/ActivityLogsPage.js";
import ComplaintsPage from "./pages/admin/ComplaintsPage.js";
import ResignManagementPage from "./pages/admin/ResignManagementPage.js";
import ResignHistoryPage from "./pages/admin/ResignHistoryPage.js";
import AdminLayout from "./components/layout/AdminLayout.js";

function MasterProtectedRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-xs text-amber-700">
        Memuat Master Dashboard...
      </div>
    );
  }
  if (!user || user.role !== "master_admin") {
    return <Redirect to="/login" />;
  }
  return <Component />;
}

// Tenant Redirect components
function RootRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-400">Memuat aplikasi...</div>;
  if (!user) return <Redirect to="/login" />;
  return <Redirect to={user.role === "employee" ? "/karyawan" : "/admin/dashboard"} />;
}

function AdminRedirect() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-xs text-slate-500">Memuat...</div>;
  if (!user) return <Redirect to="/admin/login" />;
  return <Redirect to={user.role === "employee" ? "/karyawan" : "/admin/dashboard"} />;
}

function ProtectedRoute({ component: Component, roles }: { component: React.ComponentType<any>, roles?: string[] }) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-400">
        Memuat aplikasi...
      </div>
    );
  }

  if (!user) {
    if (location.startsWith("/admin")) {
      return <Redirect to="/admin/login" />;
    }
    return <Redirect to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Redirect to={user.role === "employee" ? "/karyawan" : "/admin/dashboard"} />;
  }

  // Handle registration screen routing for employee
  if (user.role === "employee") {
    if (user.registrationStatus === "unregistered" && !location.endsWith("/registration")) {
      return <Redirect to="/employee/registration" />;
    }
    if (user.registrationStatus === "pending" && !location.endsWith("/pending")) {
      return <Redirect to="/employee/pending" />;
    }
    if (user.registrationStatus === "rejected" && !location.endsWith("/registration")) {
      return <Redirect to="/employee/registration" />;
    }
    if (user.registrationStatus === "approved" && (location.endsWith("/pending") || location.endsWith("/registration"))) {
      return <Redirect to="/karyawan" />;
    }
  }

  return <Component />;
}

function TenantRoutes() {
  const [, setLocation] = useLocation();
  const { data: config } = useQuery<any>({
    queryKey: ["/api/config"],
  });

  useEffect(() => {
    if (config) {
      document.title = `${config.singkatanPt || config.namaPt || "PT ABC"} - Sistem Absensi`;

      const root = document.documentElement;
      if (config.themePrimary) root.style.setProperty("--primary", config.themePrimary);
      if (config.themeSecondary) root.style.setProperty("--secondary", config.themeSecondary);
      if (config.themeAccent) root.style.setProperty("--accent", config.themeAccent);
      if (config.themeBackground) root.style.setProperty("--background", config.themeBackground);
      if (config.themeSidebarAccent) root.style.setProperty("--sidebar-accent", config.themeSidebarAccent);
      if (config.themePrimary) root.style.setProperty("--ring", config.themePrimary);

      const initial = config.logoInisial || (config.singkatanPt ? config.singkatanPt.charAt(0) : (config.namaPt ? config.namaPt.charAt(0) : "A"));
      const faviconSvg = `
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
          <rect width='100' height='100' rx='22' fill='%23f97316'/>
          <text x='50' y='72' font-family='Outfit, Arial, sans-serif' font-size='65' font-weight='900' fill='white' text-anchor='middle'>${initial}</text>
        </svg>
      `.trim().replace(/\s+/g, ' ');

      let faviconLink = document.getElementById("dynamic-favicon") as HTMLLinkElement;
      if (!faviconLink) {
        faviconLink = document.createElement("link");
        faviconLink.id = "dynamic-favicon";
        faviconLink.rel = "icon";
        faviconLink.type = "image/svg+xml";
        document.head.appendChild(faviconLink);
      }
      faviconLink.href = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;
    }
  }, [config]);

  return (
    <Switch>
      {/* Auth routes (public) */}
      <Route path="/login" component={LoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/employee/signup" component={SignupPage} />
      <Route path="/karyawan/signup" component={SignupPage} />

      {/* Root & admin redirects */}
      <Route path="/" component={RootRedirect} />
      <Route path="/admin" component={AdminRedirect} />

      {/* Employee Protected routes (/karyawan & /employee aliases) */}
      <Route path="/karyawan/pending">
        {() => <ProtectedRoute component={StatusPendingPage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/pending">
        {() => <ProtectedRoute component={StatusPendingPage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan/leave">
        {() => <ProtectedRoute component={LeavePage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/leave">
        {() => <ProtectedRoute component={LeavePage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan/recap">
        {() => <ProtectedRoute component={RecapPage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/recap">
        {() => <ProtectedRoute component={RecapPage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan/complaint">
        {() => <ProtectedRoute component={ComplaintPage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/complaint">
        {() => <ProtectedRoute component={ComplaintPage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan/profile">
        {() => <ProtectedRoute component={ProfilePage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/profile">
        {() => <ProtectedRoute component={ProfilePage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan/info">
        {() => <ProtectedRoute component={InfoPage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/info">
        {() => <ProtectedRoute component={InfoPage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan/documents">
        {() => <ProtectedRoute component={DocumentsPage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/documents">
        {() => <ProtectedRoute component={DocumentsPage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan/registration">
        {() => <ProtectedRoute component={RegistrationPage} roles={["employee"]} />}
      </Route>
      <Route path="/employee/registration">
        {() => <ProtectedRoute component={RegistrationPage} roles={["employee"]} />}
      </Route>
      <Route path="/karyawan">
        {() => <ProtectedRoute component={EmployeeDashboard} roles={["employee"]} />}
      </Route>
      <Route path="/employee">
        {() => <ProtectedRoute component={EmployeeDashboard} roles={["employee"]} />}
      </Route>

      {/* Admin Protected routes */}
      <Route path="/admin/dashboard">
        {() => <AdminLayout><ProtectedRoute component={AdminDashboard} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/employees">
        {() => <AdminLayout><ProtectedRoute component={EmployeeListPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/attendance">
        {() => <AdminLayout><ProtectedRoute component={AttendanceHistoryPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/recap">
        {() => <AdminLayout><ProtectedRoute component={AdminRecapPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/summary">
        {() => <AdminLayout><ProtectedRoute component={AttendanceSummaryPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/verification">
        {() => <AdminLayout><ProtectedRoute component={AdminVerificationPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/overtime-management">
        {() => <AdminLayout><ProtectedRoute component={AdminOvertimePage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/overtime-history">
        {() => <AdminLayout><ProtectedRoute component={AdminOvertimeHistoryPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/leaves">
        {() => <AdminLayout><ProtectedRoute component={AdminLeavePage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/leaves-history">
        {() => <AdminLayout><ProtectedRoute component={AdminLeaveHistoryPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/leaves-quota">
        {() => <AdminLayout><ProtectedRoute component={AdminLeaveQuotaPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/mutations">
        {() => <AdminLayout><ProtectedRoute component={MutationManagementPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/mutations-history">
        {() => <AdminLayout><ProtectedRoute component={MutationHistoryPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/warning-letters">
        {() => <AdminLayout><ProtectedRoute component={WarningLetterManagementPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/shifts">
        {() => <AdminLayout><ProtectedRoute component={AdminShiftPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/manage-admins">
        {() => <AdminLayout><ProtectedRoute component={AdminManageAdminsPage} roles={["superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/activity-logs">
        {() => <AdminLayout><ProtectedRoute component={ActivityLogsPage} roles={["superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/profile">
        {() => <AdminLayout><ProtectedRoute component={AdminProfilePage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/settings">
        {() => <AdminLayout><ProtectedRoute component={AdminSettingsPage} roles={["superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/backup">
        {() => <AdminLayout><ProtectedRoute component={BackupPage} roles={["superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/info-board">
        {() => <AdminLayout><ProtectedRoute component={InfoBoardPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/complaints">
        {() => <AdminLayout><ProtectedRoute component={ComplaintsPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/resign-management">
        {() => <AdminLayout><ProtectedRoute component={ResignManagementPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>
      <Route path="/admin/resign-history">
        {() => <AdminLayout><ProtectedRoute component={ResignHistoryPage} roles={["admin", "superadmin"]} /></AdminLayout>}
      </Route>

      <Route path="/complaint">
        {() => {
          setLocation("/employee/complaint");
          return null;
        }}
      </Route>
      <Route>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-semibold">
          Halaman Tidak Ditemukan (404)
        </div>
      </Route>
    </Switch>
  );
}

function TenantApp({ slug }: { slug: string }) {
  const { data: tenant, isLoading, isError } = useQuery<any>({
    queryKey: [`/api/tenant/${slug}`],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs text-slate-500">
        Memuat Portal {slug.toUpperCase()}...
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center normal-case">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Perusahaan Tidak Ditemukan</h1>
          <p className="text-sm text-slate-500 mt-2">
            Path <code className="bg-slate-100 px-1.5 py-0.5 rounded">/absensi/{slug}</code> belum terdaftar di sistem.
          </p>
          <a
            href="/absensi/"
            className="inline-block mt-5 px-4 py-2 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600"
          >
            Kembali ke Master Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <Router base={`/${slug}`}>
      <AuthProvider>
        <TenantRoutes />
      </AuthProvider>
    </Router>
  );
}

export default function App() {
  useEffect(() => {
    document.title = "Dashboard Pengelolaan Aplikasi Absensi";
  }, []);

  return (
    <TooltipProvider>
      <div className="app-capslock min-h-screen flex flex-col">
        <Router base="/absensi">
          <Switch>
            {/* Master Admin Routes */}
            <Route path="/login">
              {() => (
                <AuthProvider>
                  <MasterLoginPage />
                </AuthProvider>
              )}
            </Route>
            <Route path="/settings">
              {() => (
                <AuthProvider>
                  <MasterProtectedRoute component={MasterSettingsPage} />
                </AuthProvider>
              )}
            </Route>
            <Route path="/">
              {() => (
                <AuthProvider>
                  <MasterProtectedRoute component={MasterDashboardPage} />
                </AuthProvider>
              )}
            </Route>

            {/* Tenant Routes: /absensi/:slug/... */}
            <Route>
              {() => {
                const slug = getTenantSlugFromPath();
                if (!slug) return <Redirect to="/" />;
                return <TenantApp slug={slug} />;
              }}
            </Route>
          </Switch>
        </Router>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
