import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, User, Eye, EyeOff, Loader2, Building2 } from "lucide-react";

export default function MasterLoginPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const [username, setUsername] = useState("admin_nh");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-amber-700 text-xs">
        Memuat Dashboard...
      </div>
    );
  }

  if (user && user.role === "master_admin") {
    return <Redirect to="/" />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/20 to-white flex items-center justify-center p-4 normal-case">
      <div className="w-full max-w-md">
        <div className="bg-white border border-amber-200/80 rounded-2xl shadow-lg shadow-amber-900/5 p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 mb-4">
              <Building2 className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight normal-case">
              Dashboard Pengelolaan Aplikasi Absensi
            </h1>
            <p className="text-xs text-slate-500 mt-1.5 normal-case">
              Silakan masuk untuk mengelola perusahaan &amp; aplikasi absensi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-slate-700">
                Username
              </Label>
              <div className="relative">
                <User className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin_nh"
                  className="pl-10 h-11 bg-white border-amber-200 focus:border-amber-500 focus:ring-amber-500/20 normal-case"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                Kata Sandi
              </Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-amber-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="pl-10 pr-10 h-11 bg-white border-amber-200 focus:border-amber-500 focus:ring-amber-500/20 normal-case"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginMutation.isError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium normal-case">
                {loginMutation.error?.message || "Username atau kata sandi salah"}
              </div>
            )}

            <Button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-md shadow-amber-500/20 normal-case"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Masuk ke Dashboard"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-amber-100 text-center">
            <p className="text-[11px] text-slate-400 normal-case">
              dashboard.narasumberhukum.com/absensi/
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
