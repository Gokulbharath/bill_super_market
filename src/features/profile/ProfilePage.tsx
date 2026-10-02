import { useEffect, useState } from 'react';
import { Check, Pencil, User } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { roleLabels } from '@/config/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { adminService, type ProfileRecord } from '@/services/adminService';

export function ProfilePage() {
  const session = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', avatarUrl: '' });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const value = await adminService.profile();
      setProfile(value);
      setDraft({ name: value.name, email: value.email, phone: value.phone, avatarUrl: value.avatarUrl });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load profile.';
      setError(message);
      toast({ title: message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const value = await adminService.saveProfile(draft);
      setProfile(value);
      setDraft({ name: value.name, email: value.email, phone: value.phone, avatarUrl: value.avatarUrl });
      updateUser({ name: value.name, email: value.email, avatar: value.avatarUrl || undefined });
      setEditing(false);
      toast({ title: 'Profile saved' });
    } catch (reason) {
      toast({ title: reason instanceof Error ? reason.message : 'Unable to save profile.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><PageHeader title="Profile" description="Your application profile." breadcrumbs={[{ label: 'Profile' }]} />{profile && !editing && <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-2 h-4 w-4" />Edit Profile</Button>}</div>
      {loading ? <p className="text-sm text-muted-foreground">Loading profile...</p> : error ? <div className="max-w-xl rounded-md border border-destructive/40 p-4 text-sm"><p className="text-destructive">{error}</p><Button className="mt-3" variant="outline" onClick={() => void load()}>Retry</Button></div> : profile && <section className="max-w-2xl space-y-5 rounded-lg border bg-card p-5">
        <div className="flex items-center gap-4 border-b pb-4"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile" className="h-full w-full object-cover" /> : <User className="h-6 w-6" />}</div><div><h2 className="font-semibold">{profile.name}</h2><p className="text-sm text-muted-foreground">{roleLabels[session?.role || 'OWNER']}</p></div></div>
        {editing ? <form className="space-y-4" onSubmit={(event) => void save(event)}><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="profile-name">Name *</Label><Input id="profile-name" required value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="profile-email">Email</Label><Input id="profile-email" type="email" value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="profile-phone">Phone</Label><Input id="profile-phone" value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="profile-avatar">Photo URL</Label><Input id="profile-avatar" type="url" value={draft.avatarUrl} onChange={(event) => setDraft((current) => ({ ...current, avatarUrl: event.target.value }))} /></div></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setDraft({ name: profile.name, email: profile.email, phone: profile.phone, avatarUrl: profile.avatarUrl }); setEditing(false); }}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Profile'}</Button></div></form>
          : <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Name</p><p className="font-medium">{profile.name}</p></div><div><p className="text-xs text-muted-foreground">Role</p><p className="font-medium">{roleLabels[session?.role || 'OWNER']}</p></div><div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{profile.phone || '—'}</p></div><div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{profile.email || '—'}</p></div><div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Photo</p><p className="font-medium">{profile.avatarUrl ? 'Configured' : 'Not set'}</p></div><p className="text-xs text-muted-foreground sm:col-span-2">Password changes are unavailable because the current local sign-in system has no password update API.</p></div>}
        {profile && !editing && <div className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3.5 w-3.5" />Profile loaded from database</div>}
      </section>}
    </div>
  );
}
