import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MasterLayout from "./MasterLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Loader2, Save, User } from "lucide-react";

export default function MasterSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("admin_nh");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const { data: account } = useQuery<any>({
    queryKey: ["/api/master/account"],
  });

  useEffect(() => {
    if (account) {
      setUsername(account.username || "admin_nh");
      setFullName(account.fullName || "");
      setEmail(account.email || "");
    }
  }, [account]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/master/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          fullName,
          email,
          newPassword: newPassword || undefined,
        }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal memperbarui akun");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewPassword("");
      queryClient.invalidateQueries({ queryKey: ["/api/master/account"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Akun Master Admin berhasil diperbarui" });
    },
    onError: (err: Error) => {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    },
  });

  return (
    <MasterLayout title="Pengaturan Akun">
      <div className="max-w-xl bg-white rounded-2xl border border-amber-200/80 p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-amber-100">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Kredensial Admin Pengelola</h3>
            <p className="text-xs text-slate-500">
              Ubah username atau kata sandi login utama (default: admin_nh).
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="normal-case"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nama Lengkap</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="normal-case"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@narasumberhukum.com"
              className="normal-case"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              Kata Sandi Baru (Kosongkan jika tidak ingin mengganti)
            </Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan kata sandi baru..."
              className="normal-case"
            />
          </div>
        </div>

        <Button
          onClick={() => updateMutation.mutate()}
          disabled={updateMutation.isPending}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold normal-case"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Simpan Perubahan
        </Button>
      </div>
    </MasterLayout>
  );
}
