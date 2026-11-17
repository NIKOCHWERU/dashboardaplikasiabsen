import { ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Building2, LogOut, Settings } from "lucide-react";

interface MasterLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function MasterLayout({
  children,
  title = "Dashboard Pengelolaan Aplikasi Absensi",
}: MasterLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  const navItems = [
    {
      title: "Daftar & Kelola PT",
      url: "/",
      icon: Building2,
    },
    {
      title: "Pengaturan Akun",
      url: "/settings",
      icon: Settings,
    },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-white text-slate-900 normal-case">
        <Sidebar className="border-r border-amber-200/70 bg-white">
          <SidebarHeader className="border-b border-amber-100 bg-white px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold shadow-sm shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate normal-case">
                  Pengelolaan Absensi
                </p>
                <p className="text-[11px] font-medium text-amber-700 truncate normal-case">
                  Multi-Perusahaan
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="bg-white px-2 py-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 px-3 mb-1">
                Menu Utama
              </SidebarGroupLabel>
              <SidebarMenu>
                {navItems.map((item) => {
                  const isActive = location === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        onClick={() => setLocation(item.url)}
                        isActive={isActive}
                        className={`w-full justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all normal-case ${
                          isActive
                            ? "bg-amber-50 text-amber-900 border border-amber-200/80 shadow-sm font-semibold"
                            : "text-slate-600 hover:bg-amber-50/50 hover:text-amber-900"
                        }`}
                      >
                        <item.icon
                          className={`w-4 h-4 ${isActive ? "text-amber-600" : "text-slate-400"}`}
                        />
                        <span className="normal-case">{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-amber-100 bg-white p-3">
            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl bg-amber-50/50 border border-amber-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  NH
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate normal-case">
                    {user?.fullName || "Admin Pengelola"}
                  </p>
                  <p className="text-[10px] text-amber-700 truncate normal-case">
                    @{user?.username || "admin_nh"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => logoutMutation.mutate()}
                title="Keluar"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex-1 flex flex-col bg-slate-50/40 min-w-0">
          <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-amber-100 px-4 md:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-slate-600 hover:text-amber-700" />
              <div className="h-5 w-px bg-amber-200/70 hidden sm:block" />
              <h2 className="text-base font-bold text-slate-900 normal-case">{title}</h2>
            </div>
          </header>

          <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
