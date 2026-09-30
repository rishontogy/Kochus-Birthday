import { type ReactNode, type FormEvent, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Bell, BookHeart, Check, CheckCircle2, ChevronLeft, ChevronRight,
  CircleDashed, Clock3, Compass, Gift as GiftIcon, Heart, Image as ImageIcon, LayoutDashboard,
  LockKeyhole, LogOut, Menu, MessageCircle, PenLine, Plus, Send, Settings2, Sparkles,
  Star, Trash2, WandSparkles, X, CakeSlice, Layers, Search, Filter, Calendar, MapPin, Copy,
  ArrowUp, ArrowDown, Eye, EyeOff, Play, Pause, Music, Film,
} from 'lucide-react';
import {
  type Birthday, type Clue, type Gift, type Memory, type WishlistItem, type ClueInput,
  type GiftInput, type MemoryInput, type BirthdayInput, type WishlistItemInput,
  useLogin, useLogout, useGetCurrentUser, useGetExperienceHome, useGetBirthday,
  useListClues, useGetClue, useCompleteClue, useListGifts, useGetGift, useViewGift,
  useListMemories, useListFavoriteMemories, useGetMemory, useAddMemoryComment, useUpdateMemoryComment,
  useDeleteMemoryComment, useToggleMemoryReaction, useToggleMemoryFavorite,
  useCreateMemory, useUpdateMemory, useDuplicateMemory, useReorderMemories,
  useUpdateMemoryCommentStatus, useAdminDeleteMemoryComment, useDeleteMemory,
  useAddGiftComment, useDeleteGiftComment, useCreateGift, useUpdateGift, useDeleteGift,
  useUpdateGiftCommentStatus, useAdminDeleteGiftComment,
  useListWishlist, useCreateWishlistItem, useUpdateWishlistItem, useDeleteWishlistItem,
  useListChatMessages, useSendChatMessage, useGetAdminSummary, useUpdateBirthday,
  useCreateClue, useUpdateClue, useDeleteClue, useListActivity,
  getGetCurrentUserQueryKey, getGetExperienceHomeQueryKey, getGetBirthdayQueryKey,
  getListCluesQueryKey, getGetClueQueryKey, getListGiftsQueryKey, getGetGiftQueryKey,
  getListMemoriesQueryKey, getListFavoriteMemoriesQueryKey, getGetMemoryQueryKey,
  getListWishlistQueryKey, getListChatMessagesQueryKey, getGetAdminSummaryQueryKey,
} from '@workspace/api-client-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Route, Switch, Link, useLocation, useParams, Router as WouterRouter } from 'wouter';

import { useQuery } from '@tanstack/react-query';
import { SafeImage } from '@/components/safe-image';
import { ImageLightbox, type LightboxImage } from '@/components/image-lightbox';
import { MediaUpload, type UploadedImageItem } from '@/components/media-upload';
import { CommentsSection } from '@/components/comments-section';
import { MemoryCard } from '@/components/memory-card';
import { GoogleDriveMedia } from '@/components/google-drive-media';
import { GoogleDriveInputForm } from '@/components/google-drive-input-form';
import { JourneyProgress, type JourneySummary } from '@/components/journey-progress';

const queryClient = new QueryClient();

function initials(name?: string) {
  return (name || 'K').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
function formatDate(value?: string | null) {
  if (!value) return 'A little while ago';
  try {
    return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
  } catch {
    return value;
  }
}
function formatTime(value?: string | null) {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(value));
  } catch {
    return '';
  }
}

function QueryState({
  loading,
  error,
  children,
  label = 'Loading your little world…',
  onRetry,
}: {
  loading?: boolean;
  error?: unknown;
  children: ReactNode;
  label?: string;
  onRetry?: () => void;
}) {
  if (loading)
    return (
      <div className="ink-card rounded-[1.5rem] p-8 animate-pulse text-center">
        <div className="mx-auto h-10 w-10 rounded-full bg-accent animate-spin mb-4" />
        <h3 className="serif text-2xl">{label}</h3>
        <p className="eyebrow mt-2 text-muted-foreground">Gathering your private memories...</p>
      </div>
    );
  if (error)
    return (
      <div className="ink-card rounded-[1.5rem] p-8 border-destructive/30 text-center space-y-4 rise-in">
        <CircleDashed className="text-destructive mx-auto" size={32} />
        <h3 className="serif text-2xl">Something went wrong while opening our scrapbook.</h3>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          We could not fetch this chapter right now. Try again in a moment or return to your main birthday map.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="rounded-xl text-xs font-semibold">
              TRY AGAIN
            </Button>
          )}
          <Link href="/home" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground focus-ring">
            BACK TO JOURNEY
          </Link>
        </div>
      </div>
    );
  return <>{children}</>;
}

function PageTitle({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: ReactNode }) {
  return <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between rise-in">
    <div><p className="eyebrow mb-3">{eyebrow}</p><h1 className="serif text-4xl sm:text-5xl tracking-[-.03em]">{title}</h1>{detail && <p className="mt-3 max-w-2xl text-muted-foreground">{detail}</p>}</div>
    {action}
  </header>;
}

function StatusPill({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'warm' | 'sage' | 'muted' }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[.06em] uppercase', tone === 'warm' && 'bg-primary/10 text-primary', tone === 'sage' && 'bg-[hsl(164_25%_44%/_.14)] text-[hsl(164_25%_35%)]', tone === 'muted' && 'bg-muted text-muted-foreground', tone === 'default' && 'bg-accent text-accent-foreground')}>{children}</span>;
}

const navItems = [
  { href: '/home', label: 'My journey', icon: Compass },
  { href: '/birthday', label: 'Birthday letter', icon: CakeSlice },
  { href: '/clues', label: 'Clues', icon: WandSparkles },
  { href: '/gifts', label: 'Gifts', icon: GiftIcon },
  { href: '/memories', label: 'Our scrapbook', icon: BookHeart },
  { href: '/memories/favorites', label: 'Favorites ❤️', icon: Heart },
  { href: '/wishlist', label: 'Wishlist', icon: Star },
  { href: '/chat', label: 'Private chat', icon: MessageCircle },
  { href: '/notifications', label: 'Notifications', icon: Bell },
];

const adminItems = [
  { href: '/admin', label: 'Control room', icon: LayoutDashboard },
  { href: '/admin/birthday', label: 'Birthday opening', icon: CakeSlice },
  { href: '/admin/clues', label: 'Clue manager', icon: WandSparkles },
  { href: '/admin/gifts', label: 'Gift manager', icon: GiftIcon },
  { href: '/admin/memories', label: 'Memory manager', icon: BookHeart },
  { href: '/admin/activity', label: 'Activity log', icon: Clock3 },
];

function AppShell({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading } = useGetCurrentUser();
  const logout = useLogout();
  const [mobileOpen, setMobileOpen] = useState(false);
  const admin = user?.role === 'ADMIN';
  const isAdminPath = location.startsWith('/admin');
  const items = isAdminPath ? adminItems : navItems;

  useEffect(() => {
    if (!isLoading && !user) setLocation('/login');
    if (!isLoading && user && isAdminPath && !admin) setLocation('/home');
  }, [admin, isAdminPath, isLoading, setLocation, user]);

  if (isLoading) return <div className="min-h-[100dvh] journey-bg flex items-center justify-center"><div className="text-center"><Heart className="mx-auto text-primary animate-pulse" /><p className="eyebrow mt-4">Opening your private world</p></div></div>;

  return <div className="paper-texture min-h-[100dvh] journey-bg">
    <aside className={cn('fixed inset-y-0 left-0 z-40 w-[272px] bg-sidebar text-sidebar-foreground p-6 flex flex-col transition-transform duration-300 lg:translate-x-0', mobileOpen ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex items-center justify-between mb-8">
        <Link href="/home" className="focus-ring" data-testid="link-shell-logo">
          <span className="serif text-2xl">Kochu<span className="text-sidebar-primary">.</span></span>
          <span className="block eyebrow text-sidebar-foreground/60 mt-1">a birthday journey</span>
        </Link>
        <button className="lg:hidden focus-ring" onClick={() => setMobileOpen(false)} aria-label="Close menu" data-testid="button-close-menu">
          <X size={18} />
        </button>
      </div>

      <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/60 p-4 mb-6">
        <p className="eyebrow text-sidebar-foreground/55">made with a full heart</p>
        <p className="serif text-lg mt-2 font-handwritten text-2xl text-sidebar-primary">For Kochu, always.</p>
        <div className="mt-3 h-1 rounded-full bg-sidebar-border overflow-hidden">
          <div className="h-full w-3/4 bg-sidebar-primary rounded-full" />
        </div>
      </div>

      <nav className="space-y-1 overflow-y-auto flex-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
              location === href
                ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
            )}
            data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-').replaceAll('❤️', '')}`}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-sidebar-border pt-4 mt-4 space-y-2">
        {!isAdminPath && admin && (
          <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent" data-testid="link-admin-space">
            <Settings2 size={16} /> Kunju's control room
          </Link>
        )}
        {isAdminPath && (
          <Link href="/home" className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent" data-testid="link-user-space">
            <Heart size={16} /> View Kochu's journey
          </Link>
        )}
        <button
          className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent"
          onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation('/login') })}
          data-testid="button-logout"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>

    {mobileOpen && <button className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" data-testid="button-overlay-menu" />}

    <main className="min-h-[100dvh] lg:pl-[272px]">
      <div className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <button className="lg:hidden focus-ring rounded-lg p-2" onClick={() => setMobileOpen(true)} aria-label="Open menu" data-testid="button-open-menu">
            <Menu size={20} />
          </button>
          <div className="hidden lg:block eyebrow">
            {isAdminPath ? 'Kunju / control room' : 'Kochu / private birthday world'}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-semibold">{user?.displayName || 'Kochu'}</span>
              <span className="block text-[11px] text-muted-foreground">{admin ? 'Keeper of the magic' : 'the birthday girl'}</span>
            </span>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold" data-testid="avatar-current-user">
              {initials(user?.displayName)}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-12">{children}</div>
    </main>
  </div>;
}

function LoginPage() {
  const [, setLocation] = useLocation();
  const client = useQueryClient();
  const login = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  return <div className="paper-texture min-h-[100dvh] journey-bg flex items-center justify-center p-5"><div className="w-full max-w-5xl grid lg:grid-cols-[.95fr_1.05fr] overflow-hidden rounded-[2rem] border border-border bg-card/80 shadow-2xl shadow-primary/10 rise-in">
    <div className="relative overflow-hidden bg-sidebar p-8 sm:p-12 text-sidebar-foreground flex flex-col justify-between min-h-[420px]">
      <div className="absolute -right-16 -top-14 h-56 w-56 rounded-full border border-sidebar-primary/30" />
      <div className="absolute -bottom-24 -left-14 h-72 w-72 rounded-full border border-sidebar-primary/20" />
      <div>
        <p className="eyebrow text-sidebar-primary">a secret door</p>
        <h1 className="serif text-5xl sm:text-6xl leading-[.98] mt-5">A little<br /><i>world</i><br />for you.</h1>
      </div>
      <div>
        <div className="flex items-center gap-3 text-sidebar-foreground/70 text-sm">
          <Heart size={15} className="text-sidebar-primary" /> built by Kunju, with very good intentions
        </div>
        <p className="mt-5 max-w-xs text-sm leading-6 text-sidebar-foreground/55">This is not a normal birthday page. There are clues to follow, memories to keep, and a few surprises tucked away for you.</p>
      </div>
    </div>
    <div className="p-8 sm:p-12 lg:p-16">
      <p className="eyebrow">secure entry</p>
      <h2 className="serif text-4xl mt-4">Come on in, Kochu.</h2>
      <p className="mt-3 text-muted-foreground">Use the little credentials Kunju gave you.</p>
      <form className="mt-9 space-y-5" onSubmit={(e) => { e.preventDefault(); login.mutate({ data: { username, password, rememberMe } }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() }); setLocation('/home'); } }); }}>
        <label className="block"><span className="text-sm font-semibold">Username</span><Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-2 h-12 bg-background" placeholder="your secret name" data-testid="input-username" /></label>
        <label className="block"><span className="text-sm font-semibold">Password</span><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12 bg-background" placeholder="the password" data-testid="input-password" /></label>
        <label className="flex items-center gap-3 text-sm text-muted-foreground"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="accent-primary" data-testid="checkbox-remember" /> Keep this door open on this device</label>
        {login.isError && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" data-testid="status-login-error">That did not open the door. Check your details and try again.</p>}
        <Button className="h-12 w-full rounded-xl text-base" disabled={login.isPending} type="submit" data-testid="button-login">{login.isPending ? 'Checking the lock…' : 'Enter my birthday world'}<ArrowRight size={17} /></Button>
      </form>
      <p className="mt-8 text-center text-xs text-muted-foreground">Private, just like the best things.</p>
    </div>
  </div></div>;
}

function HomePage() {
  const { data, isLoading, error } = useGetExperienceHome();
  const { data: journeySummary } = useQuery<JourneySummary>({
    queryKey: ['journey-summary'],
    queryFn: async () => {
      const res = await fetch('/api/experience/journey');
      if (!res.ok) throw new Error('Failed to fetch journey');
      return res.json();
    },
  });

  return <QueryState loading={isLoading} error={error}>
    <div className="space-y-8">
      <PageTitle eyebrow="your story so far" title={`Hello, ${data?.user.displayName || 'Kochu'}.`} detail="A few lovely things are waiting for you. Take your time; this world is not going anywhere." action={<StatusPill tone="warm"><Heart size={13} /> made for you</StatusPill>} />
      
      {journeySummary && (
        <div className="rise-in">
          <JourneyProgress summary={journeySummary} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="ink-card rounded-[1.75rem] p-7 sm:p-8 flex flex-col justify-between rise-in rise-delay-2">
          <div>
            <div className="flex justify-between items-start"><span className="grid h-10 w-10 place-items-center rounded-full bg-accent"><Sparkles size={18} /></span><StatusPill tone="muted">next clue</StatusPill></div>
            <p className="eyebrow mt-6">waiting for you</p>
            <h2 className="serif text-3xl mt-2">{data?.nextClue?.title || 'The first little secret'}</h2>
            <p className="text-muted-foreground text-sm mt-3 leading-6">{data?.nextClue?.intro || 'Whenever you are ready, there is a clue with your name on it.'}</p>
          </div>
          <Link href={data?.nextClue ? `/clues/${data.nextClue.id}` : '/clues'} className="mt-7 inline-flex items-center justify-between border-t border-border pt-4 text-sm font-semibold" data-testid="link-next-clue">Open next clue <ChevronRight size={17} /></Link>
        </section>

        <section className="rise-in rise-delay-3 flex flex-col justify-between">
          <div>
            <div className="flex items-end justify-between mb-4"><div><p className="eyebrow">a note from kunju</p><h2 className="serif text-3xl mt-2">There is more to come.</h2></div><Link href="/birthday" className="text-sm text-primary font-semibold" data-testid="link-home-birthday">Read letter</Link></div>
            <div className="ink-card rounded-[1.5rem] p-6 sm:p-8 bg-secondary/35">
              <p className="serif italic text-2xl leading-relaxed max-w-3xl">“{data?.upcomingMessage || 'I have been saving a few things for you. Start anywhere. I will be close by.'}”</p>
              <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><Heart size={13} className="text-primary" /> kunju</div>
            </div>
          </div>
        </section>
      </div>

      <section>
        <div className="flex items-end justify-between mb-4"><div><p className="eyebrow">recently unlocked</p><h2 className="serif text-3xl mt-2">Tiny treasures</h2></div><Link href="/gifts" className="text-sm text-primary font-semibold" data-testid="link-home-gifts">See all gifts</Link></div>
        <div className="grid sm:grid-cols-3 gap-4">{(data?.recentGifts || []).map((gift) => <GiftMini gift={gift} key={gift.id} />)}{!data?.recentGifts?.length && <div className="ink-card rounded-2xl p-6 text-muted-foreground text-sm sm:col-span-3">Your first treasure is waiting behind the next clue.</div>}</div>
      </section>
    </div>
  </QueryState>;
}

function BirthdayPage() {
  const { data, isLoading, error } = useGetBirthday();
  return <QueryState loading={isLoading} error={error}><div className="max-w-4xl mx-auto"><PageTitle eyebrow="chapter one / the opening" title="A birthday letter, for you." detail="Take a breath before you open this. Some things deserve a slower read." /><article className="ink-card overflow-hidden rounded-[2rem] bg-card rise-in rise-delay-1">{data?.heroImage ? <SafeImage src={data.heroImage} alt="" className="h-48 sm:h-64 w-full object-cover" /> : <div className="h-36 sm:h-48 bg-sidebar relative overflow-hidden"><div className="absolute inset-0 opacity-35" style={{ background: 'radial-gradient(circle at 70% 20%, hsl(43 78% 76%), transparent 20%), radial-gradient(circle at 25% 100%, hsl(11 65% 64%), transparent 35%)' }} /><div className="absolute right-8 top-8 soft-float"><Heart size={38} className="text-sidebar-primary/60" /></div></div>}<div className="p-7 sm:p-12"><p className="eyebrow">{data?.greeting || 'my dearest kochu'}</p><h2 className="serif text-4xl sm:text-5xl mt-5">{data?.title || 'Happy birthday, my love.'}</h2><p className="text-primary mt-3">{data?.subtitle || 'A whole little universe, made just for you.'}</p><div className="my-9 h-px bg-border" /><p className="serif text-xl sm:text-2xl leading-relaxed whitespace-pre-line">{data?.message || 'Today is for celebrating every soft, funny, brilliant part of you. I wanted to give you something you could wander through — one memory, one clue, one surprise at a time.'}</p><p className="mt-8 text-muted-foreground leading-7 whitespace-pre-line">{data?.closing || 'Thank you for being my favourite person to find, every day.'}</p><div className="mt-10 flex flex-col gap-4 border-t border-border pt-7 sm:flex-row sm:items-center sm:justify-between"><span className="serif italic text-lg">{data?.buttonText || 'with all my love, Kunju'}</span><Link href="/clues" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-ring" data-testid="link-open-clues">Find the first clue <ArrowRight size={16} /></Link></div></div></article></div></QueryState>;
}

function CluesPage() {
  const { data, isLoading, error } = useListClues();
  return <QueryState loading={isLoading} error={error}><PageTitle eyebrow="chapter two / follow the thread" title="Clues, clues, clues." detail="Each one leads somewhere. Some are ready now; some prefer a little patience." /><div className="max-w-3xl space-y-3">{(data || []).map((clue, index) => <Link href={`/clues/${clue.id}`} key={clue.id} className={cn('ink-card group flex gap-4 rounded-2xl p-4 sm:p-5 transition-all hover:-translate-y-0.5 focus-ring rise-in', clue.status === 'LOCKED' && 'opacity-65')} style={{ animationDelay: `${index * 60}ms` }} data-testid={`card-clue-${clue.id}`}><div className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-xl font-mono text-sm', clue.status === 'COMPLETED' ? 'bg-[hsl(164_25%_44%/_.15)] text-[hsl(164_25%_35%)]' : clue.status === 'AVAILABLE' ? 'bg-accent' : 'bg-muted text-muted-foreground')}>{clue.status === 'COMPLETED' ? <Check size={18} /> : String(clue.order).padStart(2, '0')}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="serif text-2xl">{clue.title}</h3>{clue.status === 'COMPLETED' && <StatusPill tone="sage">found</StatusPill>}{clue.status === 'LOCKED' && <LockKeyhole size={14} className="text-muted-foreground" />}</div><p className="mt-1 text-sm text-muted-foreground line-clamp-2">{clue.intro}</p></div><ChevronRight className="mt-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" size={18} /></Link>)}{!data?.length && <EmptyState icon={WandSparkles} title="The map is still being drawn." detail="Kunju is hiding the first clue somewhere nearby." />}</div></QueryState>;
}

function ClueDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: clue, isLoading, error } = useGetClue(id, { query: { queryKey: getGetClueQueryKey(id), enabled: !!id } });
  const complete = useCompleteClue();
  const client = useQueryClient();

  return <QueryState loading={isLoading} error={error}><div className="max-w-3xl mx-auto"><Link href="/clues" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 focus-ring" data-testid="link-back-clues"><ArrowLeft size={16} /> all clues</Link>{clue && <article className="ink-card rounded-[2rem] p-7 sm:p-12 rise-in"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">clue {String(clue.order).padStart(2, '0')}</p><h1 className="serif text-4xl sm:text-5xl mt-4">{clue.title}</h1></div><div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent"><WandSparkles size={21} /></div></div><p className="serif italic text-xl text-primary mt-8">{clue.intro}</p><div className="my-8 h-px bg-border" /><p className="whitespace-pre-line leading-8 text-[1.04rem]">{clue.text}</p>{clue.instructions && <div className="mt-8 rounded-2xl border border-primary/15 bg-primary/5 p-5"><p className="eyebrow text-primary">your mission</p><p className="mt-3 leading-7">{clue.instructions}</p></div>}<div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border pt-7">{clue.status === 'COMPLETED' ? <div className="flex items-center gap-3 text-[hsl(164_25%_35%)] font-semibold"><CheckCircle2 size={21} /> Clue found on {formatDate(clue.completedAt)}</div> : clue.status === 'LOCKED' ? <div className="flex items-center gap-2 text-muted-foreground"><LockKeyhole size={17} /> This clue is still tucked away.</div> : <Button onClick={() => complete.mutate({ id: clue.id, data: {} }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetClueQueryKey(id) }); client.invalidateQueries({ queryKey: getListCluesQueryKey() }); client.invalidateQueries({ queryKey: getGetExperienceHomeQueryKey() }); client.invalidateQueries({ queryKey: getListGiftsQueryKey() }); } })} disabled={complete.isPending} className="rounded-xl" data-testid={`button-complete-clue-${clue.id}`}>{complete.isPending ? 'Saving the moment…' : 'I found it'} <Check size={16} /></Button>}<span className="text-xs text-muted-foreground">{clue.giftId ? 'There may be a gift at the end of this one.' : 'Keep going, lovely.'}</span></div></article>}</div></QueryState>;
}

function GiftMini({ gift }: { gift: Gift }) {
  const isUnlocked = gift.status === 'UNLOCKED';
  return (
    <Link
      href={`/gifts/${gift.id}`}
      className="ink-card group rounded-2xl overflow-hidden focus-ring hover:-translate-y-1 transition-transform block relative"
      data-testid={`card-gift-mini-${gift.id}`}
    >
      {gift.mediaUrl && isUnlocked ? (
        <GoogleDriveMedia propUrl={gift.mediaUrl} alt={gift.title} className="h-36 w-full object-cover" />
      ) : (
        <div className="h-36 bg-sidebar relative grid place-items-center overflow-hidden">
          <div className="absolute h-72 w-72 rounded-full border border-sidebar-primary/20" />
          {isUnlocked ? (
            <GiftIcon className="relative text-rose-500 gift-bounce" size={40} strokeWidth={1.5} />
          ) : (
            <LockKeyhole className="relative text-stone-400" size={36} strokeWidth={1.5} />
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="eyebrow">gift {String(gift.order).padStart(2, '0')}</p>
          <StatusPill tone={isUnlocked ? 'sage' : 'muted'}>
            {isUnlocked ? '🎁 Unlocked' : `🔒 Clue #${gift.unlockAfterClueNumber || gift.order || 4}`}
          </StatusPill>
        </div>
        <h3 className="serif text-xl mt-1.5 group-hover:text-primary transition-colors">{gift.title}</h3>
      </div>
    </Link>
  );
}

function GiftsPage() {
  const { data, isLoading, error } = useListGifts();
  return <QueryState loading={isLoading} error={error}>
    <PageTitle eyebrow="chapter three / little treasures" title="Gifts for you." detail="Some are wrapped in paper. Some are wrapped in a memory. Open the ones that have found you." />
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {(data || []).map((gift, index) => (
        <div key={gift.id} className="rise-in" style={{ animationDelay: `${index * 70}ms` }}>
          <GiftMini gift={gift} />
        </div>
      ))}
      {!data?.length && <div className="sm:col-span-2 lg:col-span-3"><EmptyState icon={GiftIcon} title="The gift shelf is quiet for now." detail="Find a few clues and treasures will appear here." /></div>}
    </div>
  </QueryState>;
}

function GiftDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: gift, isLoading, error } = useGetGift(id, { query: { queryKey: getGetGiftQueryKey(id), enabled: !!id } });
  const { data: clues } = useListClues();
  const { data: currentUser } = useGetCurrentUser();
  const view = useViewGift();
  const addComment = useAddGiftComment();
  const deleteComment = useDeleteGiftComment();
  const client = useQueryClient();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const isUnlocked = gift?.status === 'UNLOCKED';
  const isViewed = Boolean(gift?.viewedAt);
  const completedCluesCount = (clues || []).filter((c) => c.status === 'COMPLETED').length;

  const galleryImages: LightboxImage[] = gift
    ? (gift.images || []).map((i) => ({ url: i.url, driveFileId: i.driveFileId, caption: i.caption, label: i.label }))
    : [];

  return <QueryState loading={isLoading} error={error}>
    <div className="max-w-3xl mx-auto">
      <Link href="/gifts" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 focus-ring" data-testid="link-back-gifts">
        <ArrowLeft size={16} /> all gifts
      </Link>

      {gift && (
        !isUnlocked ? (
          /* LOCKED GIFT STATE */
          <article className="ink-card rounded-[2rem] p-8 sm:p-12 text-center space-y-6 rise-in border-rose-200/60 shadow-xl">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-md">
              <LockKeyhole size={36} />
            </div>
            <div>
              <p className="eyebrow text-rose-700">🔒 SOMETHING IS WAITING FOR YOU...</p>
              <h1 className="serif text-4xl sm:text-5xl font-bold mt-2 text-stone-800">{gift.title}</h1>
              <p className="text-stone-600 text-base mt-3 max-w-md mx-auto">
                Complete Clue #{gift.unlockAfterClueNumber || gift.order || 4} to unlock this surprise.
              </p>
            </div>

            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-6 max-w-md mx-auto space-y-2">
              <div className="flex justify-between text-xs font-bold text-stone-700">
                <span>Clue required:</span>
                <span className="text-rose-600 font-extrabold">Clue #{gift.unlockAfterClueNumber || gift.order || 4}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-stone-700">
                <span>Current progress:</span>
                <span className="text-stone-900">{completedCluesCount} / {gift.unlockAfterClueNumber || gift.order || 4} clues completed</span>
              </div>
              <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((completedCluesCount / (gift.unlockAfterClueNumber || gift.order || 4)) * 100))}%` }}
                />
              </div>
            </div>

            <Link
              href="/clues"
              className="inline-flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition-all text-sm"
              data-testid="button-go-to-clues"
            >
              GO TO CLUES <ArrowRight size={16} />
            </Link>
          </article>
        ) : (
          /* UNLOCKED GIFT STATE */
          <article className="ink-card overflow-hidden rounded-[2rem] rise-in">
            {/* Gift Cover Media */}
            {gift.mediaUrl ? (
              <GoogleDriveMedia
                propUrl={gift.mediaUrl}
                alt={gift.title}
                className="h-64 sm:h-80 w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
              />
            ) : (
              <div className="h-48 sm:h-64 bg-sidebar relative grid place-items-center overflow-hidden">
                <div className="absolute h-72 w-72 rounded-full border border-sidebar-primary/20" />
                <GiftIcon className="relative text-sidebar-primary gift-bounce" size={48} strokeWidth={1.2} />
              </div>
            )}

            <div className="p-7 sm:p-12 space-y-6">
              <div>
                <p className="eyebrow">gift {String(gift.order).padStart(2, '0')}</p>
                <h1 className="serif text-4xl sm:text-5xl mt-3">{gift.title}</h1>
                {gift.shortDescription && <p className="text-muted-foreground text-sm mt-2">{gift.shortDescription}</p>}
              </div>

              {!isViewed && isUnlocked && (
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-6 text-center space-y-4 gift-bounce">
                  <Sparkles className="mx-auto text-primary" size={28} />
                  <h3 className="serif text-2xl">Your surprise is ready ❤️</h3>
                  <p className="text-sm text-muted-foreground">A special gift created by Kunju is waiting for you.</p>
                  <Button
                    onClick={() => view.mutate({ id: gift.id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetGiftQueryKey(id) }); client.invalidateQueries({ queryKey: getListGiftsQueryKey() }); } })}
                    disabled={view.isPending}
                    className="rounded-xl px-6 py-3 text-base gap-2 bg-rose-600 hover:bg-rose-700 text-white font-bold"
                    data-testid={`button-open-gift-${gift.id}`}
                  >
                    {view.isPending ? 'Unwrapping…' : 'OPEN MY GIFT ❤️'} <GiftIcon size={18} />
                  </Button>
                </div>
              )}

              {isViewed && (
                <>
                  <p className="text-lg leading-8">{gift.description}</p>

                  <div className="my-6 rounded-2xl bg-accent/45 p-6 border border-accent/60">
                    <p className="eyebrow text-accent-foreground">a note attached</p>
                    <p className="serif italic text-2xl leading-relaxed mt-3">{gift.message}</p>
                  </div>

                  {/* Additional Gift Images Gallery */}
                  {gift.images && gift.images.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-border">
                      <p className="eyebrow">Gift Memories & Photos ({gift.images.length})</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {gift.images.map((img, idx) => (
                          <div key={img.id} className="group relative overflow-hidden rounded-xl bg-card border border-border cursor-pointer" onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}>
                            <GoogleDriveMedia propUrl={img.url} driveFileId={img.driveFileId} alt={img.caption || ''} className="h-32 w-full object-cover group-hover:scale-105 transition-transform" />
                            {img.label && <span className="absolute bottom-1 left-1 font-handwritten text-xs bg-background/90 px-2 py-0.5 rounded">{img.label}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video Player if present */}
                  {gift.videoFileId && (
                    <div className="pt-4 border-t border-border space-y-2">
                      <p className="eyebrow">Gift Video</p>
                      <GoogleDriveMedia propUrl={gift.videoFileId} mediaType="video" />
                    </div>
                  )}

                  <div className="pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary" /> Opened {formatDate(gift.viewedAt)}
                    </p>

                    <Link href="/gifts" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground focus-ring" data-testid="button-keep-memory">
                      KEEP THIS MEMORY ❤️
                    </Link>
                  </div>

                  {/* Gift Comments Section */}
                  {gift.allowComments && (
                    <div className="pt-8 border-t border-border">
                      <CommentsSection
                        comments={gift.comments || []}
                        currentUser={currentUser}
                        onPostComment={(comment) => addComment.mutate({ id: gift.id, data: { comment } }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetGiftQueryKey(id) }) })}
                        onDeleteComment={(commentId) => deleteComment.mutate({ commentId }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetGiftQueryKey(id) }) })}
                        isPending={addComment.isPending}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </article>
        )
      )}

      {/* Lightbox Modal */}
      <ImageLightbox
        images={galleryImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
      />
    </div>
  </QueryState>;
}

/* ========================================================================== */
/* MEMORIES / SCRAPBOOK USER EXPERIENCE                                       */
/* ========================================================================== */

function MemoriesPage() {
  const [category, setCategory] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'page' | 'timeline'>('grid');
  const [pageIndex, setPageIndex] = useState(0);

  const [lightboxMemory, setLightboxMemory] = useState<Memory | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data: memories, isLoading, error } = useListMemories({
    category: category || undefined,
    year: year || undefined,
    location: locationFilter || undefined,
    search: search || undefined,
  });

  const toggleFavorite = useToggleMemoryFavorite();
  const client = useQueryClient();

  const categories = ['Our Story', 'Trips', 'Funny Moments', 'Special Days', 'Little Things', 'Birthday', 'Favorites', 'Random Memories'];
  const years = ['2024', '2025', '2026'];

  const handleToggleFav = (id: string) => {
    toggleFavorite.mutate({ id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }); client.invalidateQueries({ queryKey: getListFavoriteMemoriesQueryKey() }); } });
  };

  const openLightbox = (m: Memory, idx: number = 0) => {
    setLightboxMemory(m);
    setLightboxIndex(idx);
  };

  const lightboxImages: LightboxImage[] = lightboxMemory
    ? (lightboxMemory.images || []).map((img) => ({ url: img.url, caption: img.caption, label: img.label, date: img.date }))
    : [];

  return <QueryState loading={isLoading} error={error} label="Opening our scrapbook..." onRetry={() => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() })}>
    <div className="space-y-8">
      <PageTitle
        eyebrow="chapter four / time we kept"
        title="Our Digital Scrapbook."
        detail="A personal collection of moments, laughs, and quiet memories made for Kochu by Kunju."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/memories/favorites"
              className="inline-flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 focus-ring"
              data-testid="button-view-favorites"
            >
              <Heart size={14} className="fill-current" /> FAVORITE MEMORIES ❤️
            </Link>
          </div>
        }
      />

      {/* Scrapbook Search & Filter Controls */}
      <div className="ink-card rounded-2xl p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, caption, location..."
              className="pl-9 h-10 bg-background rounded-xl text-sm"
              data-testid="input-search-memories"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs"
            data-testid="select-category-filter"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="h-10 rounded-xl border border-input bg-background px-3 text-xs"
            data-testid="select-year-filter"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 rounded-lg text-xs"
              data-testid="button-view-grid"
            >
              <Layers size={14} /> Grid
            </Button>
            <Button
              variant={viewMode === 'page' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('page')}
              className="h-8 rounded-lg text-xs"
              data-testid="button-view-page"
            >
              <BookHeart size={14} /> Page Flip
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('timeline')}
              className="h-8 rounded-lg text-xs"
              data-testid="button-view-timeline"
            >
              <Calendar size={14} /> Timeline
            </Button>
          </div>

          {(category || year || search) && (
            <button
              onClick={() => { setCategory(''); setYear(''); setSearch(''); }}
              className="text-xs text-muted-foreground hover:text-foreground"
              data-testid="button-clear-filters"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: GRID */}
      {viewMode === 'grid' && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(memories || []).map((m, idx) => (
            <MemoryCard
              key={m.id}
              memory={m}
              index={idx}
              onToggleFavorite={handleToggleFav}
              onOpenLightbox={openLightbox}
            />
          ))}
          {!memories?.length && (
            <div className="sm:col-span-2 lg:col-span-3">
              <EmptyState
                icon={BookHeart}
                title="Some beautiful memories are waiting to be added ❤️"
                detail="No memories found matching your search filters."
              />
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: PAGE FLIP */}
      {viewMode === 'page' && memories && memories.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-6 rise-in">
          <div className="ink-card rounded-[2.5rem] p-8 sm:p-12 polaroid-frame page-turn-anim min-h-[500px] flex flex-col justify-between relative">
            <div className="washi-tape-top" />
            <div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span className="eyebrow">Page {pageIndex + 1} of {memories.length}</span>
                <span>{memories[pageIndex].date}</span>
              </div>

              <div className="mt-6 rounded-2xl overflow-hidden cursor-pointer" onClick={() => openLightbox(memories[pageIndex])}>
                <GoogleDriveMedia
                  propUrl={memories[pageIndex].imageUrl}
                  alt={memories[pageIndex].title}
                  className="h-64 sm:h-80 w-full object-cover hover:opacity-95 transition-opacity"
                />
              </div>

              <h2 className="serif text-3xl sm:text-4xl mt-6">{memories[pageIndex].title}</h2>
              {memories[pageIndex].caption && (
                <p className="font-handwritten text-3xl text-primary mt-2">“{memories[pageIndex].caption}”</p>
              )}
              <p className="text-sm leading-relaxed text-muted-foreground mt-4">{memories[pageIndex].story}</p>
            </div>

            <div className="mt-8 border-t border-border pt-6 flex items-center justify-between">
              <Button
                disabled={pageIndex === 0}
                onClick={() => setPageIndex((p) => p - 1)}
                variant="outline"
                className="rounded-xl gap-2 text-xs"
                data-testid="button-page-prev"
              >
                <ChevronLeft size={16} /> PREVIOUS
              </Button>

              <Link href={`/memories/${memories[pageIndex].id}`} className="text-xs font-semibold text-primary" data-testid="button-page-view-memory">
                VIEW MEMORY →
              </Link>

              <Button
                disabled={pageIndex === memories.length - 1}
                onClick={() => setPageIndex((p) => p + 1)}
                variant="outline"
                className="rounded-xl gap-2 text-xs"
                data-testid="button-page-next"
              >
                NEXT <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: TIMELINE */}
      {viewMode === 'timeline' && memories && (
        <div className="relative max-w-3xl mx-auto space-y-12 py-4">
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-border sm:left-1/2" />
          {memories.map((m, idx) => (
            <div key={m.id} className={cn('relative flex flex-col sm:flex-row items-start gap-6 rise-in', idx % 2 === 1 ? 'sm:flex-row-reverse' : '')}>
              <div className="absolute left-[20px] top-6 z-10 h-4 w-4 rounded-full border-4 border-background bg-primary sm:left-1/2 sm:-translate-x-1/2" />
              <div className="sm:w-1/2 pl-14 sm:pl-0 sm:pr-8" style={idx % 2 === 1 ? { paddingRight: 0, paddingLeft: '2rem' } : undefined}>
                <MemoryCard memory={m} index={idx} onToggleFavorite={handleToggleFav} onOpenLightbox={openLightbox} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={Boolean(lightboxMemory)}
        onClose={() => setLightboxMemory(null)}
        onNavigate={(idx) => setLightboxIndex(idx)}
        commentCount={lightboxMemory?.commentCount}
      />
    </div>
  </QueryState>;
}

function FavoriteMemoriesPage() {
  const { data, isLoading, error } = useListFavoriteMemories();
  const toggleFavorite = useToggleMemoryFavorite();
  const client = useQueryClient();

  const handleToggleFav = (id: string) => {
    toggleFavorite.mutate({ id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }); client.invalidateQueries({ queryKey: getListFavoriteMemoriesQueryKey() }); } });
  };

  return <QueryState loading={isLoading} error={error}>
    <div className="space-y-8 max-w-5xl mx-auto">
      <Link href="/memories" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-2 focus-ring" data-testid="link-back-memories">
        <ArrowLeft size={16} /> BACK TO MEMORIES
      </Link>

      <PageTitle eyebrow="kochus treasures" title="Favorite Memories ❤️" detail="The moments you love the most, gathered in one place." />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(data || []).map((m, idx) => (
          <MemoryCard key={m.id} memory={m} index={idx} onToggleFavorite={handleToggleFav} />
        ))}
        {!data?.length && (
          <div className="sm:col-span-2 lg:col-span-3">
            <EmptyState icon={Heart} title="No favorite memories yet." detail="Tap the heart on any memory card to add it here." />
          </div>
        )}
      </div>
    </div>
  </QueryState>;
}

function MemoryDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: memory, isLoading, error } = useGetMemory(id, { query: { queryKey: getGetMemoryQueryKey(id), enabled: !!id } });
  const { data: allMemories } = useListMemories();
  const { data: currentUser } = useGetCurrentUser();

  const addComment = useAddMemoryComment();
  const updateComment = useUpdateMemoryComment();
  const deleteComment = useDeleteMemoryComment();
  const toggleReaction = useToggleMemoryReaction();
  const toggleFavorite = useToggleMemoryFavorite();
  const client = useQueryClient();

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const list = allMemories || [];
  const currentIndex = list.findIndex((m) => m.id === id);
  const prevMemory = currentIndex > 0 ? list[currentIndex - 1] : null;
  const nextMemory = currentIndex !== -1 && currentIndex < list.length - 1 ? list[currentIndex + 1] : null;

  const galleryImages: LightboxImage[] = memory
    ? (memory.images || []).map((i) => ({ url: i.url, caption: i.caption, label: i.label, date: i.date }))
    : [];

  const handleReaction = (reaction: string) => {
    toggleReaction.mutate({ id, data: { reaction } }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetMemoryQueryKey(id) }) });
  };

  const handleFavorite = () => {
    toggleFavorite.mutate({ id }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetMemoryQueryKey(id) }); client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }); } });
  };

  return <QueryState loading={isLoading} error={error}>
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navigation Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Link href="/memories" className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-ring" data-testid="link-back-to-memories">
          <ArrowLeft size={16} /> BACK TO MEMORIES
        </Link>

        <div className="flex items-center gap-3 text-xs font-semibold">
          {prevMemory && (
            <Link href={`/memories/${prevMemory.id}`} className="hover:text-primary inline-flex items-center gap-1" data-testid="link-prev-memory">
              <ChevronLeft size={16} /> PREVIOUS MEMORY
            </Link>
          )}
          {nextMemory && (
            <Link href={`/memories/${nextMemory.id}`} className="hover:text-primary inline-flex items-center gap-1" data-testid="link-next-memory">
              NEXT MEMORY <ChevronRight size={16} />
            </Link>
          )}
        </div>
      </div>

      {memory && (
        <article className="ink-card rounded-[2.5rem] p-7 sm:p-12 polaroid-frame space-y-8 rise-in">
          {/* Header Metadata */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="eyebrow">{memory.date}</span>
                {memory.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin size={13} className="text-primary" /> {memory.location}</span>}
                {memory.category && <StatusPill tone="warm">{memory.category}</StatusPill>}
              </div>
              <h1 className="serif text-4xl sm:text-5xl mt-3">{memory.title}</h1>
              {memory.customLabel && <p className="font-handwritten text-2xl text-primary mt-1">{memory.customLabel}</p>}
            </div>

            <Button
              onClick={handleFavorite}
              variant={memory.isFavorite ? 'default' : 'outline'}
              className="rounded-full gap-2 text-xs self-start"
              data-testid="button-favorite-detail"
            >
              <Heart size={15} className={memory.isFavorite ? 'fill-current' : ''} />
              {memory.isFavorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES'}
            </Button>
          </div>

          {/* Featured Cover / Hero Carousel */}
          {memory.imageUrl && (
            <div className="relative rounded-2xl overflow-hidden cursor-pointer" onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}>
              <GoogleDriveMedia
                propUrl={memory.imageUrl}
                driveFileId={memory.images?.[0]?.driveFileId}
                alt={memory.title}
                className="max-h-[480px] w-full object-cover hover:scale-[1.01] transition-transform duration-300"
              />
              {memory.caption && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-6 text-white text-center">
                  <p className="font-handwritten text-3xl">“{memory.caption}”</p>
                </div>
              )}
            </div>
          )}

          {/* Quote Banner */}
          {memory.quote && (
            <div className="ink-card rounded-2xl p-6 text-center bg-accent/30 border border-accent/60">
              <p className="serif italic text-2xl leading-relaxed text-foreground">“{memory.quote}”</p>
            </div>
          )}

          {/* Story Body */}
          <div className="prose max-w-none text-foreground/90 leading-relaxed text-lg whitespace-pre-line">
            {memory.story}
          </div>

          {/* Additional Images Gallery */}
          {memory.images && memory.images.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Photo Album ({memory.images.length} photos)</p>
                <span className="text-xs text-muted-foreground">Click any photo to open Lightbox</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {memory.images.map((img, idx) => (
                  <div key={img.id || idx} className="group relative overflow-hidden rounded-xl bg-card border border-border cursor-pointer" onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}>
                    <GoogleDriveMedia propUrl={img.url} driveFileId={img.driveFileId} alt={img.caption || ''} className="h-44 w-full object-cover group-hover:scale-105 transition-transform" />
                    {img.label && <span className="absolute bottom-2 left-2 font-handwritten text-lg bg-background/90 px-2.5 py-0.5 rounded-lg border border-border/60 shadow-sm">{img.label}</span>}
                    <span className="absolute top-2 right-2 text-[10px] font-mono bg-black/60 text-white px-2 py-0.5 rounded-full">{idx + 1} / {memory.images.length}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Video Player */}
          {memory.videoFileId && (
            <div className="pt-6 border-t border-border space-y-3">
              <p className="eyebrow">Video Memory</p>
              <GoogleDriveMedia propUrl={memory.videoFileId} mediaType="video" />
            </div>
          )}

          {/* Audio Player */}
          {memory.audioFileId && (
            <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
              <Music className="text-primary" size={24} />
              <div>
                <p className="text-sm font-semibold">Audio Note Attached</p>
              </div>
            </div>
          )}

          {/* Reactions Bar */}
          {memory.allowReactions && (
            <div className="pt-6 border-t border-border space-y-3">
              <p className="eyebrow text-xs">Reactions</p>
              <div className="flex flex-wrap items-center gap-2">
                {['❤️', '🥰', '😍', '😂', '✨'].map((emoji) => {
                  const count = memory.reactionCounts?.[emoji] || 0;
                  const isSelected = memory.userReaction === emoji;

                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(emoji)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all focus-ring',
                        isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-accent border-border',
                      )}
                      data-testid={`button-react-${emoji}`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="text-xs font-mono">{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments Section */}
          {memory.allowComments && (
            <div className="pt-8 border-t border-border">
              <CommentsSection
                comments={memory.comments || []}
                currentUser={currentUser}
                onPostComment={(comment) => addComment.mutate({ id: memory.id, data: { comment } }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetMemoryQueryKey(id) }) })}
                onEditComment={(commentId, text) => updateComment.mutate({ commentId, data: { comment: text } }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetMemoryQueryKey(id) }) })}
                onDeleteComment={(commentId) => deleteComment.mutate({ commentId }, { onSuccess: () => client.invalidateQueries({ queryKey: getGetMemoryQueryKey(id) }) })}
                isPending={addComment.isPending}
              />
            </div>
          )}
        </article>
      )}

      {/* Lightbox Modal */}
      <ImageLightbox
        images={galleryImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={(idx) => setLightboxIndex(idx)}
        commentCount={memory?.commentCount}
      />
    </div>
  </QueryState>;
}

/* ========================================================================== */
/* ADMIN MEMORIES CMS                                                         */
/* ========================================================================== */

function AdminMemoriesPage() {
  const { data: memories, isLoading, error } = useListMemories();
  const create = useCreateMemory();
  const update = useUpdateMemory();
  const duplicate = useDuplicateMemory();
  const remove = useDeleteMemory();
  const reorder = useReorderMemories();
  const updateCommentStatus = useUpdateMemoryCommentStatus();
  const adminDeleteComment = useAdminDeleteMemoryComment();

  const client = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);

  const [form, setForm] = useState({
    title: '',
    shortDescription: '',
    story: '',
    date: new Date().toISOString().slice(0, 10),
    location: '',
    category: 'Our Story',
    customLabel: '',
    caption: '',
    quote: '',
    adminNote: '',
    order: 1,
    active: true,
    featured: false,
    allowComments: true,
    allowReactions: true,
    videoFileId: '',
    audioFileId: '',
    images: [] as UploadedImageItem[],
  });

  const [manageCommentsMemory, setManageCommentsMemory] = useState<Memory | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm({
      title: '',
      shortDescription: '',
      story: '',
      date: new Date().toISOString().slice(0, 10),
      location: '',
      category: 'Our Story',
      customLabel: '',
      caption: '',
      quote: '',
      adminNote: '',
      order: (memories?.length || 0) + 1,
      active: true,
      featured: false,
      allowComments: true,
      allowReactions: true,
      videoFileId: '',
      audioFileId: '',
      images: [],
    });
    setShowForm(true);
  };

  const startEdit = (m: Memory) => {
    setEditing(m);
    setForm({
      title: m.title,
      shortDescription: m.shortDescription || '',
      story: m.story,
      date: m.date,
      location: m.location || '',
      category: m.category || 'Our Story',
      customLabel: m.customLabel || '',
      caption: m.caption || '',
      quote: m.quote || '',
      adminNote: m.adminNote || '',
      order: m.order,
      active: m.active,
      featured: m.featured || false,
      allowComments: m.allowComments ?? true,
      allowReactions: m.allowReactions ?? true,
      videoFileId: m.videoFileId || '',
      audioFileId: m.audioFileId || '',
      images: (m.images || []).map((img) => ({
        id: img.id,
        driveFileId: img.driveFileId,
        filename: img.filename,
        caption: img.caption || '',
        label: img.label || '',
        date: img.date || '',
        displayOrder: img.displayOrder,
        isCover: img.isCover,
        url: img.url,
      })),
    });
    setShowForm(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload: MemoryInput = {
      title: form.title,
      shortDescription: form.shortDescription || null,
      story: form.story,
      date: form.date,
      location: form.location || null,
      category: form.category || null,
      customLabel: form.customLabel || null,
      caption: form.caption || null,
      quote: form.quote || null,
      adminNote: form.adminNote || null,
      order: Number(form.order),
      active: form.active,
      featured: form.featured,
      allowComments: form.allowComments,
      allowReactions: form.allowReactions,
      videoFileId: form.videoFileId || null,
      audioFileId: form.audioFileId || null,
      images: form.images.map((img, i) => ({
        id: img.id || null,
        driveFileId: img.driveFileId,
        filename: img.filename,
        caption: img.caption || null,
        label: img.label || null,
        date: img.date || null,
        displayOrder: i + 1,
        isCover: img.isCover,
        url: img.url,
      })),
    };

    const cb = () => {
      client.invalidateQueries({ queryKey: getListMemoriesQueryKey() });
      setShowForm(false);
    };

    if (editing) {
      update.mutate({ id: editing.id, data: payload }, { onSuccess: cb });
    } else {
      create.mutate({ data: payload }, { onSuccess: cb });
    }
  };

  const moveOrder = (index: number, direction: 'up' | 'down') => {
    if (!memories) return;
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= memories.length) return;

    const list = [...memories];
    const temp = list[index];
    list[index] = list[target];
    list[target] = temp;

    const orderedIds = list.map((m) => m.id);
    reorder.mutate({ data: { orderedIds } }, { onSuccess: () => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }) });
  };

  return <QueryState loading={isLoading} error={error}>
    <div className="space-y-8">
      <PageTitle
        eyebrow="control room / scrapbook"
        title="Memory Manager CMS"
        detail="Create and edit digital scrapbook pages, photo albums, captions, labels, and comment settings."
        action={
          <Button onClick={openNew} className="rounded-xl gap-2" data-testid="button-add-memory">
            <Plus size={16} /> ADD MEMORY
          </Button>
        }
      />

      {/* Add / Edit Form Modal / Card */}
      {showForm && (
        <form onSubmit={submit} className="ink-card rounded-[2rem] p-6 sm:p-10 mb-8 rise-in space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="serif text-3xl">{editing ? 'EDIT MEMORY' : 'ADD MEMORY'}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 focus-ring rounded" aria-label="Close form" data-testid="button-close-memory-form">
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Memory Title *</span>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Our Little Moment ❤️" className="mt-1" data-testid="input-memory-title" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" data-testid="select-memory-category">
                {['Our Story', 'Trips', 'Funny Moments', 'Special Days', 'Little Things', 'Birthday', 'Favorites', 'Random Memories'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Date *</span>
              <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-1" data-testid="input-memory-date" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Location</span>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Hyderabad, Café, etc." className="mt-1" data-testid="input-memory-location" />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Short Description</span>
              <Input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief 1-liner preview" className="mt-1" data-testid="input-memory-short-desc" />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Long Story *</span>
              <Textarea required value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} placeholder="Write the full memory story here..." className="mt-1 min-h-[120px]" data-testid="input-memory-story" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Custom Label</span>
              <Input value={form.customLabel} onChange={(e) => setForm({ ...form, customLabel: e.target.value })} placeholder="e.g. Best view, That smile ❤️" className="mt-1" data-testid="input-memory-custom-label" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Caption</span>
              <Input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="e.g. I still remember how happy we were." className="mt-1" data-testid="input-memory-caption" />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Optional Quote</span>
              <Input value={form.quote} onChange={(e) => setForm({ ...form, quote: e.target.value })} placeholder="Romantic quote banner" className="mt-1" data-testid="input-memory-quote" />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Private Admin Note (Only Kunju sees this)</span>
              <Input value={form.adminNote} onChange={(e) => setForm({ ...form, adminNote: e.target.value })} placeholder="e.g. Hidden details, notes" className="mt-1" data-testid="input-memory-admin-note" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Display Order</span>
              <Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="mt-1" data-testid="input-memory-order" />
            </label>
          </div>

          {/* Multiple Image Upload Section */}
          <div className="pt-4 border-t border-border">
            <p className="eyebrow mb-2">Memory Images & Photos</p>
            <MediaUpload
              images={form.images}
              onChange={(imgs) => setForm({ ...form, images: imgs })}
              allowMultiple={true}
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-6 pt-4 border-t border-border text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-primary" data-testid="checkbox-memory-active" /> Active (Visible to Kochu)
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-primary" data-testid="checkbox-memory-featured" /> Featured Memory
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.allowComments} onChange={(e) => setForm({ ...form, allowComments: e.target.checked })} className="accent-primary" data-testid="checkbox-memory-comments" /> Allow Comments
            </label>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.allowReactions} onChange={(e) => setForm({ ...form, allowReactions: e.target.checked })} className="accent-primary" data-testid="checkbox-memory-reactions" /> Allow Reactions
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} data-testid="button-cancel-memory-form">CANCEL</Button>
            <Button type="submit" disabled={create.isPending || update.isPending} className="rounded-xl px-6" data-testid="button-save-memory">
              {create.isPending || update.isPending ? 'SAVE MEMORY…' : 'SAVE MEMORY'} <Check size={16} />
            </Button>
          </div>
        </form>
      )}

      {/* Memories List CMS Cards */}
      <div className="space-y-4">
        {(memories || []).map((m, idx) => (
          <div key={m.id} className="ink-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rise-in" data-testid={`card-admin-memory-${m.id}`}>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary/50 border border-border">
                <GoogleDriveMedia propUrl={m.imageUrl} driveFileId={m.images?.[0]?.driveFileId} alt={m.title} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="serif text-2xl font-medium">{m.title}</h3>
                  <StatusPill tone={m.active ? 'sage' : 'muted'}>{m.active ? 'active' : 'hidden'}</StatusPill>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {m.date} {m.location ? `· ${m.location}` : ''} {m.category ? `· ${m.category}` : ''}
                </p>
                <div className="flex gap-3 text-[11px] text-muted-foreground mt-2">
                  <span>📷 {m.images?.length || 0} photos</span>
                  <span>💬 {m.commentCount || 0} comments</span>
                  <span>❤️ {Object.keys(m.reactionCounts || {}).length} reactions</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-center">
              <button onClick={() => moveOrder(idx, 'up')} disabled={idx === 0} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 focus-ring rounded" aria-label="MOVE UP" data-testid={`button-move-up-memory-${m.id}`}>
                <ArrowUp size={16} />
              </button>
              <button onClick={() => moveOrder(idx, 'down')} disabled={idx === (memories?.length || 0) - 1} className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 focus-ring rounded" aria-label="MOVE DOWN" data-testid={`button-move-down-memory-${m.id}`}>
                <ArrowDown size={16} />
              </button>
              <Link href={`/memories/${m.id}`} className="p-2 text-muted-foreground hover:text-primary focus-ring rounded" aria-label="VIEW MEMORY" data-testid={`button-view-memory-${m.id}`}>
                <Eye size={16} />
              </Link>
              <button onClick={() => setManageCommentsMemory(m)} className="p-2 text-muted-foreground hover:text-primary focus-ring rounded" aria-label="MANAGE COMMENTS" data-testid={`button-manage-comments-${m.id}`}>
                <MessageCircle size={16} />
              </button>
              <button onClick={() => startEdit(m)} className="p-2 text-muted-foreground hover:text-primary focus-ring rounded" aria-label="EDIT MEMORY" data-testid={`button-edit-memory-${m.id}`}>
                <PenLine size={16} />
              </button>
              <button onClick={() => duplicate.mutate({ id: m.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }) })} className="p-2 text-muted-foreground hover:text-primary focus-ring rounded" aria-label="DUPLICATE MEMORY" data-testid={`button-duplicate-memory-${m.id}`}>
                <Copy size={16} />
              </button>
              <button onClick={() => remove.mutate({ id: m.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }) })} className="p-2 text-muted-foreground hover:text-destructive focus-ring rounded" aria-label="DELETE MEMORY" data-testid={`button-delete-memory-${m.id}`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Admin Comments Management Modal */}
      {manageCommentsMemory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-background/80 backdrop-blur-md rise-in">
          <div className="ink-card rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="eyebrow">Admin Comment Management</p>
                <h3 className="serif text-2xl">{manageCommentsMemory.title}</h3>
              </div>
              <button onClick={() => setManageCommentsMemory(null)} className="p-1 focus-ring rounded" data-testid="button-close-admin-comments">
                <X size={20} />
              </button>
            </div>

            <CommentsSection
              comments={manageCommentsMemory.comments || []}
              currentUser={{ id: 'kunju', displayName: 'Kunju', role: 'ADMIN' }}
              onPostComment={() => {}}
              onDeleteComment={(commentId) => adminDeleteComment.mutate({ commentId }, { onSuccess: () => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }) })}
              onToggleHideComment={(commentId, hidden) => updateCommentStatus.mutate({ commentId, data: { hidden } }, { onSuccess: () => client.invalidateQueries({ queryKey: getListMemoriesQueryKey() }) })}
            />
          </div>
        </div>
      )}
    </div>
  </QueryState>;
}

/* ========================================================================== */
/* ADMIN GIFTS CMS                                                            */
/* ========================================================================== */

function AdminGiftsPage() {
  const { data: gifts, isLoading, error } = useListGifts();
  const create = useCreateGift();
  const update = useUpdateGift();
  const remove = useDeleteGift();
  const updateCommentStatus = useUpdateGiftCommentStatus();
  const adminDeleteComment = useAdminDeleteGiftComment();
  const client = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Gift | null>(null);

  const [form, setForm] = useState({
    order: 1,
    title: '',
    shortDescription: '',
    description: '',
    message: '',
    mediaUrl: '',
    videoFileId: '',
    audioFileId: '',
    requiredClueId: '',
    unlockAfterClueNumber: 4,
    unlockType: 'clue' as GiftInput['unlockType'],
    unlockAt: '',
    allowComments: true,
    active: true,
    featured: false,
    buttonText: 'KEEP THIS MEMORY ❤️',
    images: [] as UploadedImageItem[],
  });

  const openNew = () => {
    setEditing(null);
    setForm({
      order: (gifts?.length || 0) + 1,
      title: '',
      shortDescription: '',
      description: '',
      message: '',
      mediaUrl: '',
      videoFileId: '',
      audioFileId: '',
      requiredClueId: '',
      unlockAfterClueNumber: (gifts?.length || 0) + 1,
      unlockType: 'clue',
      unlockAt: '',
      allowComments: true,
      active: true,
      featured: false,
      buttonText: 'KEEP THIS MEMORY ❤️',
      images: [],
    });
    setShowForm(true);
  };

  const startEdit = (g: Gift) => {
    setEditing(g);
    setForm({
      order: g.order,
      title: g.title,
      shortDescription: g.shortDescription || '',
      description: g.description,
      message: g.message,
      mediaUrl: g.mediaUrl || '',
      videoFileId: g.videoFileId || '',
      audioFileId: g.audioFileId || '',
      requiredClueId: g.requiredClueId || '',
      unlockAfterClueNumber: g.unlockAfterClueNumber ?? g.order,
      unlockType: g.unlockType,
      unlockAt: g.unlockAt || '',
      allowComments: g.allowComments ?? true,
      active: g.active,
      featured: g.featured || false,
      buttonText: g.buttonText || 'KEEP THIS MEMORY ❤️',
      images: (g.images || []).map((img) => ({
        id: img.id,
        driveFileId: img.driveFileId,
        filename: img.filename,
        caption: img.caption || '',
        label: img.label || '',
        displayOrder: img.displayOrder,
        isCover: img.isCover,
        url: img.url,
      })),
    });
    setShowForm(true);
  };

  const handleManualUnlock = async (giftId: string) => {
    if (!window.confirm('Unlock this gift for Kochu now?')) return;
    await fetch(`/api/admin/gifts/${giftId}/unlock`, { method: 'POST' });
    client.invalidateQueries({ queryKey: getListGiftsQueryKey() });
  };

  const handleManualLock = async (giftId: string) => {
    if (!window.confirm('Lock this gift again for Kochu?')) return;
    await fetch(`/api/admin/gifts/${giftId}/lock`, { method: 'POST' });
    client.invalidateQueries({ queryKey: getListGiftsQueryKey() });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload: GiftInput = {
      order: Number(form.order),
      title: form.title,
      shortDescription: form.shortDescription || null,
      description: form.description,
      message: form.message,
      mediaUrl: form.mediaUrl || null,
      videoFileId: form.videoFileId || null,
      audioFileId: form.audioFileId || null,
      requiredClueId: form.unlockAfterClueNumber ? `clue-${form.unlockAfterClueNumber}` : null,
      unlockAfterClueNumber: form.unlockAfterClueNumber,
      unlockAfterClueId: form.unlockAfterClueNumber ? `clue-${form.unlockAfterClueNumber}` : null,
      unlockType: form.unlockType,
      unlockAt: form.unlockAt || null,
      allowComments: form.allowComments,
      active: form.active,
      featured: form.featured,
      buttonText: form.buttonText || null,
      images: form.images.map((img, i) => ({
        id: img.id || null,
        driveFileId: img.driveFileId,
        filename: img.filename,
        caption: img.caption || null,
        label: img.label || null,
        displayOrder: i + 1,
        isCover: img.isCover,
        url: img.url,
      })),
    };

    const cb = () => {
      client.invalidateQueries({ queryKey: getListGiftsQueryKey() });
      setShowForm(false);
    };

    if (editing) {
      update.mutate({ id: editing.id, data: payload }, { onSuccess: cb });
    } else {
      create.mutate({ data: payload }, { onSuccess: cb });
    }
  };

  return <QueryState loading={isLoading} error={error}>
    <div className="space-y-8">
      <PageTitle
        eyebrow="control room / treasures"
        title="Gift Manager CMS"
        detail="Manage gift surprises, unlock conditions, images, and messages."
        action={
          <Button onClick={openNew} className="rounded-xl gap-2" data-testid="button-add-gift">
            <Plus size={16} /> ADD GIFT
          </Button>
        }
      />

      {showForm && (
        <form onSubmit={submit} className="ink-card rounded-[2rem] p-6 sm:p-10 mb-8 rise-in space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="serif text-3xl">{editing ? 'EDIT GIFT' : 'ADD GIFT'}</h2>
            <button type="button" onClick={() => setShowForm(false)} className="p-1 focus-ring rounded" aria-label="Close form" data-testid="button-close-gift-form">
              <X size={20} />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Gift Title *</span>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="A Little Something ❤️" className="mt-1" data-testid="input-gift-title" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Order *</span>
              <Input type="number" required value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="mt-1" data-testid="input-gift-order" />
            </label>

            {/* UNLOCK AFTER CLUE # Selector */}
            <div className="sm:col-span-2 pt-2 border-t border-border">
              <label className="block text-sm font-bold text-stone-800 mb-2">
                UNLOCK AFTER CLUE # *
              </label>
              <div className="flex flex-wrap gap-2.5 text-xs">
                {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                  <label
                    key={num}
                    className={`cursor-pointer px-3.5 py-2 rounded-xl border flex items-center gap-2 font-semibold transition-all ${
                      Number(form.unlockAfterClueNumber) === num
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="unlockAfterClueNumber"
                      value={num}
                      checked={Number(form.unlockAfterClueNumber) === num}
                      onChange={(e) => setForm({ ...form, unlockAfterClueNumber: Number(e.target.value) })}
                      className="hidden"
                    />
                    {num === 0 ? '○ Immediately' : `● Clue #${num}`}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Completing this clue automatically unlocks this surprise for Kochu.
              </p>
            </div>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Short Description</span>
              <Input value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} placeholder="I wanted you to have this memory." className="mt-1" data-testid="input-gift-short-desc" />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Gift Description *</span>
              <Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 min-h-[90px]" data-testid="input-gift-description" />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-sm font-semibold">Personal Message *</span>
              <Textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="WRITE YOUR MESSAGE..." className="mt-1 min-h-[100px]" data-testid="input-gift-message" />
            </label>

            {/* Video Link */}
            <div className="sm:col-span-2 pt-2 border-t border-border">
              <label className="block text-sm font-semibold mb-1">
                GIFT VIDEO GOOGLE DRIVE LINK (Optional)
              </label>
              <Input
                value={form.videoFileId}
                onChange={(e) => setForm({ ...form, videoFileId: e.target.value })}
                placeholder="Paste Google Drive video link here (e.g. https://drive.google.com/file/d/FILE_ID/view)"
                className="mt-1"
                data-testid="input-gift-video"
              />
              {form.videoFileId && (
                <div className="mt-3 max-w-md">
                  <p className="text-xs font-bold text-stone-600 mb-1">Video Preview:</p>
                  <GoogleDriveMedia propUrl={form.videoFileId} mediaType="video" />
                </div>
              )}
            </div>

            <label className="block">
              <span className="text-sm font-semibold">Unlock Type</span>
              <select value={form.unlockType} onChange={(e) => setForm({ ...form, unlockType: e.target.value as GiftInput['unlockType'] })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" data-testid="select-gift-unlock-type">
                <option value="clue">After Clue</option>
                <option value="scheduled">Scheduled Date/Time</option>
                <option value="immediate">Immediate</option>
                <option value="manual">Manual Admin Unlock</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Button Text</span>
              <Input value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} placeholder="KEEP THIS MEMORY ❤️" className="mt-1" data-testid="input-gift-button-text" />
            </label>
          </div>

          {/* Gift Image Upload */}
          <div className="pt-4 border-t border-border">
            <p className="eyebrow mb-2">Gift Media & Photos</p>
            <MediaUpload
              images={form.images}
              onChange={(imgs) => setForm({ ...form, images: imgs })}
              allowMultiple={true}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)} data-testid="button-cancel-gift-form">CANCEL</Button>
            <Button type="submit" disabled={create.isPending || update.isPending} className="rounded-xl px-6" data-testid="button-save-gift">
              {create.isPending || update.isPending ? 'SAVE GIFT…' : 'SAVE GIFT'} <Check size={16} />
            </Button>
          </div>
        </form>
      )}

      {/* Gifts Grid CMS */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(gifts || []).map((gift) => (
          <div key={gift.id} className="ink-card rounded-2xl overflow-hidden flex flex-col justify-between" data-testid={`card-admin-gift-${gift.id}`}>
            {gift.mediaUrl ? (
              <GoogleDriveMedia propUrl={gift.mediaUrl} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="h-32 bg-secondary/50 grid place-items-center"><GiftIcon className="text-primary/60" size={32} /></div>
            )}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <p className="eyebrow">gift {String(gift.order).padStart(2, '0')}</p>
                <h3 className="serif text-2xl mt-1">{gift.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Required Clue: <strong className="text-stone-800">Clue #{gift.unlockAfterClueNumber || gift.order || 4}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{gift.description}</p>
              </div>

              <div className="mt-4 border-t border-border pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <StatusPill tone={gift.status === 'UNLOCKED' ? 'sage' : 'muted'}>
                    {gift.status === 'UNLOCKED' ? '🎁 Unlocked' : '🔒 Locked'}
                  </StatusPill>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(gift)} className="p-1.5 text-muted-foreground hover:text-primary focus-ring rounded" aria-label="EDIT GIFT" data-testid={`button-edit-gift-${gift.id}`}>
                      <PenLine size={16} />
                    </button>
                    <button onClick={() => remove.mutate({ id: gift.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListGiftsQueryKey() }) })} className="p-1.5 text-muted-foreground hover:text-destructive focus-ring rounded" aria-label="DELETE GIFT" data-testid={`button-delete-gift-${gift.id}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-stone-200/50">
                  {gift.status === 'LOCKED' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualUnlock(gift.id)}
                      className="h-7 text-[11px] font-bold bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                      data-testid={`button-unlock-gift-${gift.id}`}
                    >
                      UNLOCK NOW
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleManualLock(gift.id)}
                      className="h-7 text-[11px] font-bold bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                      data-testid={`button-lock-gift-${gift.id}`}
                    >
                      LOCK AGAIN
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </QueryState>;
}

function AdminOverview() {
  const { data, isLoading, error } = useGetAdminSummary();
  const stats = [
    { key: 'progress', value: `${data?.progress.percent ?? 0}%`, label: 'journey explored', Icon: Compass },
    { key: 'gifts', value: data?.giftsUnlocked ?? 0, label: 'gifts unlocked', Icon: GiftIcon },
    { key: 'memories', value: data?.memoryCount ?? 0, label: 'memories saved', Icon: BookHeart },
    { key: 'messages', value: data?.unreadMessages ?? 0, label: 'unread messages', Icon: MessageCircle },
  ];

  return <QueryState loading={isLoading} error={error}>
    <PageTitle eyebrow="kunju / control room" title="Keep the magic moving." detail="A clear view of Kochu's journey, without losing the softness." action={<StatusPill tone="sage"><span className="h-1.5 w-1.5 rounded-full bg-current" /> private world live</StatusPill>} />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(({ key, value, label, Icon }) => (
        <div className="ink-card rounded-2xl p-5" key={key} data-testid={`stat-${key}`}>
          <Icon size={17} className="text-primary" />
          <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="ink-card rounded-2xl p-6 sm:p-8">
        <div className="flex items-start justify-between">
          <div><p className="eyebrow">the next little thing</p><h2 className="serif text-3xl mt-2">Upcoming surprise</h2></div>
          <Sparkles className="text-primary" />
        </div>
        <p className="serif italic text-xl mt-8 leading-relaxed">{data?.upcomingSurprise || 'No surprise scheduled yet. The blank space is full of possibility.'}</p>
        <div className="mt-8 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${data?.progress.percent ?? 0}%` }} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">{data?.progress.completed ?? 0} of {data?.progress.total ?? 0} clues completed</p>
      </section>
      <section className="ink-card rounded-2xl p-6">
        <div className="flex justify-between items-center mb-5">
          <h2 className="serif text-2xl">Recent activity</h2>
          <Link href="/admin/activity" className="text-xs font-semibold text-primary" data-testid="link-admin-activity">See all</Link>
        </div>
        <div className="space-y-4">
          {(data?.recentActivity || []).slice(0, 5).map((activity) => (
            <div className="flex gap-3" key={activity.id} data-testid={`activity-preview-${activity.id}`}>
              <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
              <div>
                <p className="text-sm"><span className="font-semibold">{activity.actor}</span> {activity.action}</p>
                <p className="text-xs text-muted-foreground mt-1">{activity.detail} · {formatTime(activity.createdAt)}</p>
              </div>
            </div>
          ))}
          {!data?.recentActivity?.length && <p className="text-sm text-muted-foreground">The room is waiting for its first event.</p>}
        </div>
      </section>
    </div>
  </QueryState>;
}

function AdminBirthdayPage() {
  const { data, isLoading, error } = useGetBirthday();
  const update = useUpdateBirthday();
  const client = useQueryClient();
  const [form, setForm] = useState<BirthdayInput | null>(null);

  const current = form || (data ? { title: data.title, subtitle: data.subtitle, greeting: data.greeting, message: data.message, closing: data.closing, buttonText: data.buttonText, heroImage: data.heroImage, active: data.active } : null);

  return <QueryState loading={isLoading} error={error}>
    <PageTitle eyebrow="control room / opening" title="Birthday opening." detail="The first page Kochu sees. Make it feel like you." action={<StatusPill tone={data?.active ? 'sage' : 'muted'}>{data?.active ? 'published' : 'hidden'}</StatusPill>} />
    {current && <form className="ink-card rounded-2xl p-6 sm:p-8" onSubmit={(e) => { e.preventDefault(); update.mutate({ data: current }, { onSuccess: () => { client.invalidateQueries({ queryKey: getGetBirthdayQueryKey() }); setForm(null); } }); }}>
      <div className="grid gap-5 md:grid-cols-2">
        {[['title', 'Title'], ['subtitle', 'Subtitle'], ['greeting', 'Greeting'], ['buttonText', 'Button text'], ['closing', 'Closing']].map(([key, label]) => (
          <label key={key} className={key === 'closing' ? 'block md:col-span-2' : 'block'}>
            <span className="text-sm font-semibold">{label}</span>
            <Input value={current[key as keyof BirthdayInput] as string} onChange={(e) => setForm({ ...current, [key]: e.target.value })} className="mt-2" data-testid={`input-birthday-${key}`} />
          </label>
        ))}
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold">Message</span>
          <Textarea value={current.message} onChange={(e) => setForm({ ...current, message: e.target.value })} className="mt-2 min-h-36" data-testid="input-birthday-message" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-sm font-semibold">Hero image URL</span>
          <Input value={current.heroImage || ''} onChange={(e) => setForm({ ...current, heroImage: e.target.value || null })} className="mt-2" data-testid="input-birthday-image" />
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={current.active} onChange={(e) => setForm({ ...current, active: e.target.checked })} className="accent-primary" data-testid="checkbox-birthday-active" /> Show this opening to Kochu
        </label>
      </div>
      <div className="mt-7 flex justify-end">
        <Button type="submit" disabled={update.isPending} className="rounded-xl" data-testid="button-save-birthday">
          {update.isPending ? 'Saving…' : 'Save opening'} <Check size={16} />
        </Button>
      </div>
    </form>}
  </QueryState>;
}

function AdminCluesPage() {
  const { data, isLoading, error } = useListClues();
  const create = useCreateClue(); const update = useUpdateClue(); const remove = useDeleteClue(); const client = useQueryClient();
  const [editing, setEditing] = useState<Clue | null>(null); const [show, setShow] = useState(false);
  const blank: ClueInput = { order: (data?.length || 0) + 1, title: '', intro: '', text: '', instructions: '', unlockType: 'immediate', unlockAt: null, requiresClueId: null, giftId: null, active: true };
  const [form, setForm] = useState<ClueInput>(blank);

  const edit = (clue: Clue) => { setEditing(clue); setForm({ order: clue.order, title: clue.title, intro: clue.intro, text: clue.text, instructions: clue.instructions, unlockType: clue.unlockType, unlockAt: clue.unlockAt, requiresClueId: clue.requiresClueId, giftId: clue.giftId, active: clue.active }); setShow(true); };
  const reset = () => { setEditing(null); setForm({ ...blank, order: (data?.length || 0) + 1 }); setShow(false); };
  const submit = (e: FormEvent) => { e.preventDefault(); const cb = () => { client.invalidateQueries({ queryKey: getListCluesQueryKey() }); reset(); }; editing ? update.mutate({ id: editing.id, data: form }, { onSuccess: cb }) : create.mutate({ data: form }, { onSuccess: cb }); };

  return <QueryState loading={isLoading} error={error}>
    <PageTitle eyebrow="control room / chapters" title="Clue manager." detail="Build the breadcrumb trail, one secret at a time." action={<Button onClick={() => { setForm(blank); setShow(true); }} className="rounded-xl" data-testid="button-add-clue"><Plus size={16} /> New clue</Button>} />
    {show && <AdminForm title={editing ? 'Edit clue' : 'New clue'} onClose={reset} onSubmit={submit} pending={create.isPending || update.isPending} submitLabel={editing ? 'Save clue' : 'Create clue'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="text-sm font-semibold">Title</span><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2" data-testid="input-clue-title" /></label>
        <label><span className="text-sm font-semibold">Order</span><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="mt-2" data-testid="input-clue-order" /></label>
        <label className="sm:col-span-2"><span className="text-sm font-semibold">Intro</span><Input value={form.intro} onChange={(e) => setForm({ ...form, intro: e.target.value })} className="mt-2" data-testid="input-clue-intro" /></label>
        <label className="sm:col-span-2"><span className="text-sm font-semibold">Clue text</span><Textarea required value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} className="mt-2" data-testid="input-clue-text" /></label>
        <label className="sm:col-span-2"><span className="text-sm font-semibold">Instructions</span><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="mt-2" data-testid="input-clue-instructions" /></label>
        <label><span className="text-sm font-semibold">Unlock type</span><select value={form.unlockType} onChange={(e) => setForm({ ...form, unlockType: e.target.value as ClueInput['unlockType'] })} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" data-testid="select-clue-unlock"><option value="immediate">Immediate</option><option value="previous">After previous</option><option value="scheduled">Scheduled</option><option value="manual">Manual</option></select></label>
        <label><span className="text-sm font-semibold">Gift ID <span className="font-normal text-muted-foreground">(optional)</span></span><Input value={form.giftId || ''} onChange={(e) => setForm({ ...form, giftId: e.target.value || null })} className="mt-2" data-testid="input-clue-gift" /></label>
      </div>
    </AdminForm>}

    <div className="ink-card rounded-2xl overflow-hidden">
      <div className="divide-y divide-border">
        {(data || []).map((clue) => (
          <div className="flex items-center gap-4 p-4 sm:p-5" key={clue.id} data-testid={`row-clue-${clue.id}`}>
            <span className="font-mono text-xs text-muted-foreground w-7">{String(clue.order).padStart(2, '0')}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{clue.title}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{clue.intro}</p>
            </div>
            <StatusPill tone={clue.status === 'COMPLETED' ? 'sage' : clue.status === 'LOCKED' ? 'muted' : 'warm'}>{clue.status.toLowerCase()}</StatusPill>
            <button onClick={() => edit(clue)} className="p-2 text-muted-foreground hover:text-primary focus-ring rounded" aria-label={`Edit ${clue.title}`} data-testid={`button-edit-clue-${clue.id}`}>
              <PenLine size={16} />
            </button>
            <button onClick={() => remove.mutate({ id: clue.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListCluesQueryKey() }) })} className="p-2 text-muted-foreground hover:text-destructive focus-ring rounded" aria-label={`Delete ${clue.title}`} data-testid={`button-delete-clue-${clue.id}`}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        {!data?.length && <div className="p-8"><EmptyState icon={WandSparkles} title="No clues yet." detail="Give Kochu somewhere lovely to begin." /></div>}
      </div>
    </div>
  </QueryState>;
}

function AdminForm({ title, onClose, onSubmit, pending, submitLabel, children }: { title: string; onClose: () => void; onSubmit: (e: FormEvent) => void; pending: boolean; submitLabel: string; children: ReactNode }) {
  return <form onSubmit={onSubmit} className="ink-card rounded-2xl p-6 sm:p-8 mb-6 rise-in">
    <div className="flex items-center justify-between mb-6">
      <h2 className="serif text-2xl">{title}</h2>
      <button type="button" onClick={onClose} className="p-1 focus-ring rounded" aria-label="Close form" data-testid="button-close-admin-form">
        <X size={18} />
      </button>
    </div>
    {children}
    <div className="mt-7 flex justify-end gap-3">
      <Button type="button" variant="ghost" onClick={onClose} data-testid="button-cancel-admin-form">Cancel</Button>
      <Button type="submit" disabled={pending} className="rounded-xl" data-testid="button-submit-admin-form">
        {pending ? 'Saving…' : submitLabel} <Check size={15} />
      </Button>
    </div>
  </form>;
}

function WishlistPage() {
  const { data, isLoading, error } = useListWishlist();
  const client = useQueryClient();
  const create = useCreateWishlistItem();
  const update = useUpdateWishlistItem();
  const remove = useDeleteWishlistItem();
  const [editing, setEditing] = useState<WishlistItem | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '', externalUrl: '', priority: 2 });
  const reset = () => { setForm({ title: '', description: '', imageUrl: '', externalUrl: '', priority: 2 }); setAdding(false); setEditing(null); };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload: WishlistItemInput = { ...form, imageUrl: form.imageUrl || null, externalUrl: form.externalUrl || null, priority: Number(form.priority) };
    if (editing) update.mutate({ id: editing.id, data: payload }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListWishlistQueryKey() }); reset(); } });
    else create.mutate({ data: payload }, { onSuccess: () => { client.invalidateQueries({ queryKey: getListWishlistQueryKey() }); reset(); } });
  };

  const startEdit = (item: WishlistItem) => {
    setEditing(item);
    setAdding(true);
    setForm({ title: item.title, description: item.description, imageUrl: item.imageUrl || '', externalUrl: item.externalUrl || '', priority: item.priority });
  };

  return <QueryState loading={isLoading} error={error}>
    <PageTitle eyebrow="chapter five / maybe someday" title="Wishlist." detail="A soft little list of things Kochu likes, dreams about, or would be delighted to stumble upon." action={<Button onClick={() => setAdding(true)} className="rounded-xl" data-testid="button-add-wishlist"><Plus size={16} /> Add a wish</Button>} />
    {adding && <form onSubmit={submit} className="ink-card rounded-2xl p-6 mb-6 rise-in">
      <div className="flex items-center justify-between mb-5">
        <h2 className="serif text-2xl">{editing ? 'Edit this wish' : 'Add a new wish'}</h2>
        <button type="button" onClick={reset} className="focus-ring p-1" aria-label="Close wishlist form" data-testid="button-close-wishlist-form"><X size={18} /></button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="text-sm font-semibold">Title</span><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2" data-testid="input-wishlist-title" /></label>
        <label className="block"><span className="text-sm font-semibold">Priority</span><select value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" data-testid="select-wishlist-priority"><option value={1}>Very much</option><option value={2}>Would be lovely</option><option value={3}>Just a thought</option></select></label>
        <label className="block sm:col-span-2"><span className="text-sm font-semibold">Why this one?</span><Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2" data-testid="input-wishlist-description" /></label>
        <label className="block"><span className="text-sm font-semibold">Image URL <span className="font-normal text-muted-foreground">(optional)</span></span><Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className="mt-2" data-testid="input-wishlist-image" /></label>
        <label className="block"><span className="text-sm font-semibold">Link <span className="font-normal text-muted-foreground">(optional)</span></span><Input value={form.externalUrl} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} className="mt-2" data-testid="input-wishlist-url" /></label>
      </div>
      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={create.isPending || update.isPending} className="rounded-xl" data-testid="button-save-wishlist">{editing ? 'Save changes' : 'Add to wishlist'}</Button>
        <Button type="button" variant="ghost" onClick={reset} data-testid="button-cancel-wishlist">Cancel</Button>
      </div>
    </form>}

    <div className="grid gap-4 md:grid-cols-2">
      {(data || []).map((item) => (
        <article key={item.id} className="ink-card rounded-2xl overflow-hidden flex min-h-[170px]" data-testid={`card-wishlist-${item.id}`}>
          {item.imageUrl && <SafeImage src={item.imageUrl} alt="" className="w-28 object-cover" />}
          <div className="flex-1 p-5 flex flex-col">
            <div className="flex justify-between gap-3">
              <StatusPill tone={item.priority === 1 ? 'warm' : 'muted'}>{item.priority === 1 ? 'high hopes' : item.priority === 2 ? 'would be lovely' : 'someday'}</StatusPill>
              <div className="flex gap-1">
                <button onClick={() => startEdit(item)} className="p-1.5 text-muted-foreground hover:text-primary focus-ring rounded" aria-label={`Edit ${item.title}`} data-testid={`button-edit-wishlist-${item.id}`}><PenLine size={15} /></button>
                <button onClick={() => remove.mutate({ id: item.id }, { onSuccess: () => client.invalidateQueries({ queryKey: getListWishlistQueryKey() }) })} className="p-1.5 text-muted-foreground hover:text-destructive focus-ring rounded" aria-label={`Delete ${item.title}`} data-testid={`button-delete-wishlist-${item.id}`}><Trash2 size={15} /></button>
              </div>
            </div>
            <h2 className="serif text-2xl mt-3">{item.title}</h2>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
            {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noreferrer" className="mt-auto pt-4 text-xs font-semibold text-primary" data-testid={`link-wishlist-${item.id}`}>See the original note <ArrowRight size={12} className="inline" /></a>}
          </div>
        </article>
      ))}
      {!data?.length && !adding && <div className="md:col-span-2"><EmptyState icon={Star} title="Your list is waiting for its first wish." detail="Add something small, impossible, or wonderfully specific." action={<Button onClick={() => setAdding(true)} variant="outline" data-testid="button-empty-add-wishlist">Write a wish</Button>} /></div>}
    </div>
  </QueryState>;
}

function ChatPage() {
  const { data, isLoading, error } = useListChatMessages();
  const client = useQueryClient();
  const send = useSendChatMessage();
  const [message, setMessage] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    send.mutate({ data: { message: message.trim() } }, { onSuccess: () => { setMessage(''); client.invalidateQueries({ queryKey: getListChatMessagesQueryKey() }); } });
  };

  return <QueryState loading={isLoading} error={error}>
    <div className="max-w-3xl mx-auto">
      <PageTitle eyebrow="chapter six / just us" title="Private chat." detail="For the thoughts that do not belong anywhere else." />
      <section className="ink-card rounded-[1.75rem] overflow-hidden">
        <div className="bg-sidebar p-5 sm:p-6 text-sidebar-foreground flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground"><Heart size={17} /></div>
          <div><p className="font-semibold">Kunju</p><p className="text-xs text-sidebar-foreground/60">always nearby</p></div>
          <span className="ml-auto flex items-center gap-2 text-xs text-sidebar-foreground/60"><span className="h-2 w-2 rounded-full bg-[hsl(164_45%_55%)]" /> private</span>
        </div>
        <div className="min-h-[390px] max-h-[520px] overflow-y-auto p-5 sm:p-8 space-y-5 bg-card/50">
          {data?.length ? data.map((item) => (
            <div key={item.id} className={cn('flex gap-3', item.senderRole === 'USER' ? 'justify-end' : 'justify-start')} data-testid={`message-${item.id}`}>
              <div className={cn('max-w-[82%] sm:max-w-[68%]', item.senderRole === 'USER' ? 'items-end' : 'items-start')}>
                <div className={cn('rounded-2xl px-4 py-3 text-sm leading-6', item.senderRole === 'USER' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary/70 rounded-bl-sm')}>
                  <p>{item.message}</p>
                </div>
                <p className="mt-1 px-1 text-[10px] text-muted-foreground">{item.senderName} · {formatTime(item.createdAt)}</p>
              </div>
            </div>
          )) : (
            <div className="h-full min-h-[300px] grid place-items-center text-center">
              <div><MessageCircle className="mx-auto text-primary/50" size={28} /><p className="serif text-2xl mt-4">A quiet little room.</p><p className="text-sm text-muted-foreground mt-2">Say the first thing that comes to mind.</p></div>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="border-t border-border p-4 flex gap-3">
          <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write to Kunju…" className="h-11 rounded-xl bg-background" maxLength={1000} data-testid="input-chat-message" />
          <Button type="submit" disabled={!message.trim() || send.isPending} className="h-11 w-11 shrink-0 rounded-xl p-0" aria-label="Send message" data-testid="button-send-message"><Send size={16} /></Button>
        </form>
      </section>
    </div>
  </QueryState>;
}

function NotificationsPage() {
  return <div className="max-w-3xl mx-auto">
    <PageTitle eyebrow="a gentle nudge" title="Notifications." detail="Nothing noisy. Just the moments worth looking at." />
    <EmptyState icon={Bell} title="All quiet here." detail="When a clue unlocks or Kunju leaves you a note, it will appear here." action={<Link href="/home" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground" data-testid="link-notifications-home">Back to my journey <ArrowRight size={15} /></Link>} />
  </div>;
}

function AdminActivityPage() {
  const { data, isLoading, error } = useListActivity();
  return <QueryState loading={isLoading} error={error}>
    <PageTitle eyebrow="control room / paper trail" title="Activity log." detail="A quiet record of the little world being built." />
    <div className="ink-card rounded-2xl divide-y divide-border">
      {(data || []).map((activity) => (
        <div className="p-5 flex gap-4" key={activity.id} data-testid={`row-activity-${activity.id}`}>
          <div className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent"><Clock3 size={15} /></div>
          <div className="flex-1">
            <p className="text-sm"><span className="font-semibold">{activity.actor}</span> {activity.action}</p>
            <p className="text-sm text-muted-foreground mt-1">{activity.detail}</p>
            <p className="eyebrow mt-2">{formatDate(activity.createdAt)} · {formatTime(activity.createdAt)}</p>
          </div>
        </div>
      ))}
      {!data?.length && <div className="p-8"><EmptyState icon={Clock3} title="No activity yet." detail="The first little action will appear here." /></div>}
    </div>
  </QueryState>;
}

function EmptyState({ icon: Icon, title, detail, action }: { icon: typeof Heart; title: string; detail: string; action?: ReactNode }) {
  return <div className="ink-card rounded-[1.5rem] p-10 sm:p-14 text-center">
    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent"><Icon size={24} /></div>
    <h2 className="serif text-3xl mt-5">{title}</h2>
    <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{detail}</p>
    {action && <div className="mt-6">{action}</div>}
  </div>;
}

function NotFoundPage() {
  return <div className="min-h-[100dvh] journey-bg grid place-items-center p-6 text-center">
    <div>
      <p className="eyebrow">wrong turn</p>
      <h1 className="serif text-6xl mt-4">404</h1>
      <p className="text-muted-foreground mt-3">This page is not part of the journey.</p>
      <Link href="/home" className="inline-flex mt-7 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground" data-testid="link-404-home">
        Return to the map
      </Link>
    </div>
  </div>;
}

function Router() {
  const [location] = useLocation();
  if (location === '/login' || location === '/') return <Switch><Route path="/login" component={LoginPage} /><Route path="/" component={LoginPage} /></Switch>;

  return <AppShell>
    <Switch>
      <Route path="/home" component={HomePage} />
      <Route path="/birthday" component={BirthdayPage} />
      <Route path="/clues" component={CluesPage} />
      <Route path="/clues/:id" component={ClueDetailPage} />
      <Route path="/gifts" component={GiftsPage} />
      <Route path="/gifts/:id" component={GiftDetailPage} />
      <Route path="/memories" component={MemoriesPage} />
      <Route path="/memories/favorites" component={FavoriteMemoriesPage} />
      <Route path="/memories/:id" component={MemoryDetailPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/admin" component={AdminOverview} />
      <Route path="/admin/birthday" component={AdminBirthdayPage} />
      <Route path="/admin/clues" component={AdminCluesPage} />
      <Route path="/admin/gifts" component={AdminGiftsPage} />
      <Route path="/admin/memories" component={AdminMemoriesPage} />
      <Route path="/admin/activity" component={AdminActivityPage} />
      <Route component={NotFoundPage} />
    </Switch>
  </AppShell>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;