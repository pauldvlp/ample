'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { AiMarkdown } from './ai-markdown';
import { useSettings } from '@/components/providers/settings-provider';
import { PROVIDER_LABELS, type AiProviderId } from '@/lib/ai/models';
import type { ExecutedAction } from '@/lib/ai/agent-tools';
import type { ThreadSummary, ThreadMessage } from '@/lib/ai/threads';
import {
  loadThread as loadThreadAction,
  deleteThread as deleteThreadAction,
  renameThread as renameThreadAction,
  clearAllThreads as clearAllThreadsAction,
} from '@/lib/actions/threads';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  PieChartIcon,
  PlusSignIcon,
  Wallet01Icon,
  Agreement01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import {
  ArrowUp,
  Copy,
  Check,
  Loader2,
  Trash2,
  Pencil,
  SquarePen,
  History,
  Settings2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: ExecutedAction[] | null;
  pending?: boolean;
  error?: boolean;
}

type StreamEvent =
  | { type: 'thread'; threadId: string; title: string }
  | { type: 'actions'; actions: ExecutedAction[] }
  | { type: 'delta'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export interface AssistantWorkspaceProps {
  threads: ThreadSummary[];
  activeThreadId: string | null;
  initialMessages: ThreadMessage[];
}

const EXAMPLES = [
  { key: 'assistant.exSpend', icon: PieChartIcon },
  { key: 'assistant.exLog', icon: PlusSignIcon },
  { key: 'assistant.exSavings', icon: Wallet01Icon },
  { key: 'assistant.exDebts', icon: Agreement01Icon },
] as const;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function toChatMsg(m: ThreadMessage): ChatMsg {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    actions: m.actions ?? undefined,
    error: m.error,
  };
}

/** When the model returns actions but no prose, synthesize a one-line reply. */
function fallbackReply(
  actions: ExecutedAction[],
  t: (k: string, v?: Record<string, string | number>) => string,
): string {
  if (!actions.length) return t('agent.nothing');
  const ok = actions.filter((a) => a.ok).length;
  if (ok === 0) return t('agent.failed');
  return t('agent.done', { n: ok });
}

/** Short, localized "updated N ago" (falls back to a date past a week). */
function relativeTime(ms: number, locale: string): string {
  const diff = ms - Date.now();
  const abs = Math.abs(diff);
  const MIN = 60_000,
    HR = 3_600_000,
    DAY = 86_400_000,
    WEEK = 7 * DAY;
  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (abs < MIN) return rtf.format(0, 'minute');
    if (abs < HR) return rtf.format(Math.round(diff / MIN), 'minute');
    if (abs < DAY) return rtf.format(Math.round(diff / HR), 'hour');
    if (abs < WEEK) return rtf.format(Math.round(diff / DAY), 'day');
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'short',
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

function greeting(t: (k: string) => string, mounted: boolean): string {
  if (!mounted) return t('assistant.greetGeneric');
  const h = new Date().getHours();
  if (h < 12) return t('assistant.greetMorning');
  if (h < 19) return t('assistant.greetAfternoon');
  return t('assistant.greetEvening');
}

/* -------------------------------------------------------------------------- */
/*  Action chips (list of what the agent did this turn)                       */
/* -------------------------------------------------------------------------- */

function ActionResultList({ actions }: { actions: ExecutedAction[] }) {
  if (!actions.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {actions.map((a, i) => (
        <div
          key={i}
          className={cn(
            'flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
            a.ok ? 'border-positive/25 bg-positive/8' : 'border-negative/25 bg-negative/8',
          )}
        >
          <span
            className={cn(
              'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full',
              a.ok ? 'bg-positive/15 text-positive' : 'bg-negative/15 text-negative',
            )}
          >
            {a.ok ? <Check className="size-3" /> : <span className="text-[10px]">!</span>}
          </span>
          <span className="min-w-0">
            <span className="font-medium text-foreground">{a.label}</span>
            {a.ok
              ? a.detail && <span className="text-muted-foreground"> · {a.detail}</span>
              : a.error && <span className="text-negative/90"> · {a.error}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Assistant message (markdown + action chips + copy-with-formatting)        */
/* -------------------------------------------------------------------------- */

function AssistantMessage({
  msg,
  copied,
  onCopy,
  t,
}: {
  msg: ChatMsg;
  copied: boolean;
  onCopy: (msg: ChatMsg, node: HTMLElement | null) => void;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const showCopy = !msg.pending && !!msg.content;

  return (
    <div className="group/msg flex flex-col items-start gap-1">
      <div className="w-full max-w-full">
        <div ref={contentRef}>
          {msg.content ? (
            <AiMarkdown text={msg.content} />
          ) : msg.error ? (
            <p className="text-sm text-negative">{t('agent.error')}</p>
          ) : null}
        </div>
        {msg.actions && <ActionResultList actions={msg.actions} />}
        {msg.pending && !msg.content && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t('assistant.thinking')}
          </span>
        )}
      </div>
      {showCopy && (
        <button
          type="button"
          onClick={() => onCopy(msg, contentRef.current)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/msg:opacity-100 focus-visible:opacity-100"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-positive" />
              {t('assistant.copied')}
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              {t('assistant.copy')}
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  History panel (thread list) — shared by desktop aside + mobile sheet      */
/* -------------------------------------------------------------------------- */

/** Inline rename field — mounted only while editing, so the draft seeds from the
 *  current title via the useState initializer (no state-syncing effect). */
function RenameInput({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = React.useState(initial);
  return (
    <Input
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSubmit(draft);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onSubmit(draft)}
      className="m-1 h-8 text-sm"
    />
  );
}

function ThreadRow({
  thread,
  active,
  editing,
  locale,
  onOpen,
  onDelete,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  t,
}: {
  thread: ThreadSummary;
  active: boolean;
  editing: boolean;
  locale: string;
  onOpen: () => void;
  onDelete: () => void;
  onStartRename: () => void;
  onSubmitRename: (title: string) => void;
  onCancelRename: () => void;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const title = thread.title || t('assistant.threadUntitled');

  return (
    <div
      className={cn(
        'group/row relative flex items-center gap-0.5 rounded-lg pr-1 transition-colors',
        active ? 'bg-primary/10' : 'hover:bg-muted/60',
      )}
    >
      {editing ? (
        <RenameInput initial={thread.title} onSubmit={onSubmitRename} onCancel={onCancelRename} />
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left"
        >
          <span
            className={cn(
              'w-full truncate text-sm',
              active ? 'font-medium text-foreground' : 'text-foreground/90',
            )}
          >
            {title}
          </span>
          <span suppressHydrationWarning className="text-[11px] text-muted-foreground">
            {relativeTime(thread.updatedAt, locale)}
          </span>
        </button>
      )}

      {!editing && (
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100 data-[active=true]:opacity-100"
          data-active={active}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('assistant.rename')}
            title={t('assistant.rename')}
            onClick={onStartRename}
          >
            <Pencil className="size-3.5" />
          </Button>
          <ConfirmDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t('action.delete')}
                title={t('action.delete')}
              >
                <Trash2 className="size-3.5" />
              </Button>
            }
            title={t('assistant.deleteTitle')}
            description={t('assistant.deleteBody')}
            confirmLabel={t('action.delete')}
            onConfirm={onDelete}
          />
        </div>
      )}
    </div>
  );
}

function HistoryPanel({
  threads,
  activeId,
  editingId,
  locale,
  onNew,
  onOpen,
  onDelete,
  onClearAll,
  onStartRename,
  onSubmitRename,
  onCancelRename,
  t,
}: {
  threads: ThreadSummary[];
  activeId: string | null;
  editingId: string | null;
  locale: string;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onStartRename: (id: string) => void;
  onSubmitRename: (id: string, title: string) => void;
  onCancelRename: () => void;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="p-2">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNew}
        >
          <SquarePen className="size-4" />
          {t('assistant.newChat')}
        </Button>
      </div>

      <div className="flex items-center justify-between px-3 pt-1 pb-1.5">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t('assistant.history')}
        </span>
        {threads.length > 0 && (
          <ConfirmDialog
            trigger={
              <button
                type="button"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('assistant.clearAll')}
              </button>
            }
            title={t('assistant.clearAllTitle')}
            description={t('assistant.clearAllBody')}
            confirmLabel={t('assistant.clearAll')}
            onConfirm={onClearAll}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {threads.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">{t('assistant.noHistory')}</p>
            <p className="mt-1 text-xs text-muted-foreground/80">{t('assistant.historyHint')}</p>
          </div>
        ) : (
          threads.map((thread) => (
            <ThreadRow
              key={thread.id}
              thread={thread}
              active={thread.id === activeId}
              editing={thread.id === editingId}
              locale={locale}
              onOpen={() => onOpen(thread.id)}
              onDelete={() => onDelete(thread.id)}
              onStartRename={() => onStartRename(thread.id)}
              onSubmitRename={(title) => onSubmitRename(thread.id, title)}
              onCancelRename={onCancelRename}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Composer                                                                  */
/* -------------------------------------------------------------------------- */

function Composer({
  value,
  onChange,
  onSend,
  pending,
  hero,
  placeholder,
  sendLabel,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  pending: boolean;
  hero?: boolean;
  placeholder: string;
  sendLabel: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background shadow-sm transition-colors focus-within:border-ring/60">
      <div className="relative">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={placeholder}
          rows={hero ? 2 : 1}
          className={cn(
            'resize-none border-0 bg-transparent px-3.5 pr-12 shadow-none focus-visible:border-0 focus-visible:ring-0',
            hero ? 'min-h-[3.5rem] py-3.5 text-base' : 'min-h-[2.75rem] py-3',
            'max-h-44',
          )}
        />
        <Button
          type="button"
          size="icon-sm"
          onClick={onSend}
          disabled={pending || !value.trim()}
          className="absolute right-2 bottom-2 rounded-lg"
          aria-label={sendLabel}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty hero (greeting + composer + example cards)                          */
/* -------------------------------------------------------------------------- */

function EmptyHero({
  displayName,
  mounted,
  input,
  setInput,
  onSend,
  onPick,
  pending,
  composerRef,
  t,
}: {
  displayName: string;
  mounted: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onPick: (text: string) => void;
  pending: boolean;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const name = displayName && displayName !== 'Ample' ? displayName : '';
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative grid size-16 place-items-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-gradient-to-br from-brass/70 to-primary/70 blur-xl"
            />
            <span
              aria-hidden
              className="relative size-14 rounded-full bg-gradient-to-br from-brass to-primary shadow-lg shadow-primary/30 ring-1 ring-white/25"
            />
          </div>
          <h2
            suppressHydrationWarning
            className="mt-5 font-display text-2xl text-foreground sm:text-[1.75rem]"
          >
            {greeting(t, mounted)}
            {name ? `, ${name}` : ''}
          </h2>
          <p className="font-display text-2xl text-muted-foreground sm:text-[1.75rem]">
            {t('assistant.heroSubtitle')}
          </p>
        </div>

        <Composer
          inputRef={composerRef}
          value={input}
          onChange={setInput}
          onSend={onSend}
          pending={pending}
          hero
          placeholder={t('agent.placeholder')}
          sendLabel={t('assistant.send')}
        />

        <div className="mt-6">
          <p className="mb-2 px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t('assistant.examplesTitle')}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.key}
                type="button"
                disabled={pending}
                onClick={() => onPick(t(ex.key))}
                className="group flex items-center gap-3 rounded-xl border border-border/70 bg-background px-3.5 py-3 text-left text-sm transition-colors hover:border-brass/40 hover:bg-muted/50 disabled:opacity-60"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brass/10 text-brass">
                  <HugeiconsIcon icon={ex.icon} className="hg-icon size-4" />
                </span>
                <span className="min-w-0 text-foreground/90">{t(ex.key)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Disabled state (AI off)                                                   */
/* -------------------------------------------------------------------------- */

function DisabledState({
  t,
  onEnable,
}: {
  t: (k: string, v?: Record<string, string | number>) => string;
  onEnable: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-brass/12">
        <HugeiconsIcon icon={SparklesIcon} className="hg-icon size-6 text-brass" />
      </span>
      <div className="space-y-1.5">
        <p className="font-display text-lg text-foreground">{t('assistant.offTitle')}</p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">{t('assistant.offBody')}</p>
      </div>
      <Button onClick={onEnable}>
        <Settings2 className="size-4" />
        {t('assistant.enable')}
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Workspace                                                                 */
/* -------------------------------------------------------------------------- */

export function AssistantWorkspace({
  threads: initialThreads,
  activeThreadId,
  initialMessages,
}: AssistantWorkspaceProps) {
  const { t, locale, displayName, aiEnabled, aiProvider } = useSettings();
  const router = useRouter();

  const [threads, setThreads] = React.useState<ThreadSummary[]>(initialThreads);
  const [activeId, setActiveId] = React.useState<string | null>(activeThreadId);
  const [messages, setMessages] = React.useState<ChatMsg[]>(() => initialMessages.map(toChatMsg));
  const [input, setInput] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [loadingThread, setLoadingThread] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const idCounter = React.useRef(0);
  const nextId = React.useCallback(() => `local-${idCounter.current++}`, []);

  React.useEffect(() => {
    // Greeting daypart is client-only (avoids an SSR/client timezone mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => abortRef.current?.abort();
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const setUrl = React.useCallback((id: string | null) => {
    if (typeof window === 'undefined') return;
    // Shallow URL update so refresh/bookmark reopens the right thread without a
    // full navigation that would remount mid-stream.
    window.history.replaceState(null, '', id ? `/assistant?t=${id}` : '/assistant');
  }, []);

  const patchAssistant = React.useCallback((patch: Partial<ChatMsg>) => {
    setMessages((m) => {
      if (!m.length) return m;
      const copy = [...m];
      copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch };
      return copy;
    });
  }, []);

  const onThread = React.useCallback(
    (threadId: string, title: string) => {
      setActiveId(threadId);
      setThreads((prev) => {
        const now = Date.now();
        const label = title || t('assistant.threadUntitled');
        const idx = prev.findIndex((x) => x.id === threadId);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], title: title || copy[idx].title, updatedAt: now };
          return [...copy].sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [{ id: threadId, title: label, updatedAt: now }, ...prev];
      });
      setUrl(threadId);
    },
    [t, setUrl],
  );

  const send = React.useCallback(
    async (raw?: string) => {
      const content = (raw ?? input).trim();
      if (!content || pending) return;

      const history = messages
        .filter((m) => !m.error && !m.pending)
        .map((m) => ({ role: m.role, content: m.content }));
      const outgoing = [...history, { role: 'user' as const, content }];

      setMessages((m) => [
        ...m,
        { id: nextId(), role: 'user', content },
        { id: nextId(), role: 'assistant', content: '', pending: true },
      ]);
      setInput('');
      setPending(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      let acc = '';
      let actions: ExecutedAction[] | undefined;
      let sawError = false;

      try {
        const res = await fetch('/api/ai/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: outgoing, threadId: activeId }),
          signal: ctrl.signal,
        });

        if (!res.ok || !res.body) {
          patchAssistant({
            content: res.status === 403 ? t('ai.disabledShort') : t('agent.error'),
            pending: false,
            error: true,
          });
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            const lineStr = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!lineStr) continue;
            let ev: StreamEvent;
            try {
              ev = JSON.parse(lineStr) as StreamEvent;
            } catch {
              continue;
            }
            if (ev.type === 'thread') {
              onThread(ev.threadId, ev.title);
            } else if (ev.type === 'actions') {
              actions = ev.actions;
              patchAssistant({ actions, pending: acc.length === 0 });
            } else if (ev.type === 'delta') {
              acc += ev.text;
              patchAssistant({ content: acc, actions, pending: false });
            } else if (ev.type === 'error') {
              sawError = true;
            }
          }
        }

        if (acc) {
          patchAssistant({ content: acc, actions, pending: false });
        } else if (actions?.length) {
          patchAssistant({
            content: fallbackReply(actions, t),
            actions,
            pending: false,
          });
        } else {
          patchAssistant({
            content: sawError ? t('agent.error') : t('agent.nothing'),
            pending: false,
            error: sawError,
          });
        }

        if (actions?.some((a) => a.ok)) router.refresh();
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') {
          patchAssistant({ content: acc, pending: false });
          return;
        }
        patchAssistant({ content: t('agent.error'), pending: false, error: true });
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null;
        setPending(false);
      }
    },
    [input, pending, messages, activeId, patchAssistant, onThread, router, t, nextId],
  );

  const newChat = React.useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setActiveId(null);
    setPending(false);
    setInput('');
    setHistoryOpen(false);
    setEditingId(null);
    setUrl(null);
    requestAnimationFrame(() => composerRef.current?.focus());
  }, [setUrl]);

  const openThread = React.useCallback(
    async (id: string) => {
      if (id === activeId || loadingThread) {
        setHistoryOpen(false);
        return;
      }
      abortRef.current?.abort();
      setHistoryOpen(false);
      setEditingId(null);
      setLoadingThread(true);
      const res = await loadThreadAction(id);
      setLoadingThread(false);
      if (res.ok && res.data) {
        setMessages(res.data.messages.map(toChatMsg));
        setActiveId(id);
        setPending(false);
        setUrl(id);
      }
    },
    [activeId, loadingThread, setUrl],
  );

  const removeThread = React.useCallback(
    async (id: string) => {
      setThreads((prev) => prev.filter((x) => x.id !== id));
      if (id === activeId) newChat();
      await deleteThreadAction(id);
    },
    [activeId, newChat],
  );

  const clearAll = React.useCallback(async () => {
    setThreads([]);
    newChat();
    await clearAllThreadsAction();
  }, [newChat]);

  const submitRename = React.useCallback(async (id: string, title: string) => {
    const clean = title.trim();
    setEditingId(null);
    if (!clean) return;
    setThreads((prev) => prev.map((x) => (x.id === id ? { ...x, title: clean } : x)));
    await renameThreadAction(id, clean);
  }, []);

  const copyMessage = React.useCallback(async (msg: ChatMsg, node: HTMLElement | null) => {
    const md = msg.content;
    try {
      if (node && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        // Rich copy: markdown as text/plain (formatting characters preserved)
        // + the already-rendered HTML as text/html (bold/lists survive a paste
        // into rich editors). Falls back to plain text where unsupported.
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([md], { type: 'text/plain' }),
            'text/html': new Blob([node.innerHTML], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(md);
      }
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId((c) => (c === msg.id ? null : c)), 1600);
    } catch {
      /* clipboard blocked / unavailable */
    }
  }, []);

  const activeTitle = threads.find((x) => x.id === activeId)?.title || t('assistant.title');
  const providerLabel =
    aiEnabled && aiProvider ? (PROVIDER_LABELS[aiProvider as AiProviderId] ?? aiProvider) : null;

  const historyProps = {
    threads,
    activeId,
    editingId,
    locale,
    onNew: newChat,
    onOpen: openThread,
    onDelete: removeThread,
    onClearAll: clearAll,
    onStartRename: setEditingId,
    onSubmitRename: submitRename,
    onCancelRename: () => setEditingId(null),
    t,
  };

  return (
    <div className="flex h-[calc(100svh-7rem)] min-h-[460px] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      {/* history panel — desktop */}
      <aside className="hidden w-72 shrink-0 border-r border-border/70 lg:block">
        <HistoryPanel {...historyProps} />
      </aside>

      {/* chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* slim top bar */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-2 sm:px-3">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={t('assistant.history')}
            onClick={() => setHistoryOpen(true)}
          >
            <History className="size-4" />
          </Button>
          <div className="min-w-0 flex-1 px-1">
            <p className="truncate font-display text-sm text-foreground">{activeTitle}</p>
            {providerLabel && (
              <p className="truncate text-[11px] text-muted-foreground">{providerLabel}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            aria-label={t('assistant.newChat')}
            title={t('assistant.newChat')}
            onClick={newChat}
          >
            <SquarePen className="size-4" />
          </Button>
        </div>

        {/* body */}
        {!aiEnabled ? (
          <DisabledState t={t} onEnable={() => router.push('/settings#ai-settings')} />
        ) : messages.length === 0 ? (
          <EmptyHero
            displayName={displayName}
            mounted={mounted}
            input={input}
            setInput={setInput}
            onSend={() => void send()}
            onPick={(text) => void send(text)}
            pending={pending}
            composerRef={composerRef}
            t={t}
          />
        ) : (
          <>
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl space-y-5 px-4 py-5">
                {messages.map((m) =>
                  m.role === 'user' ? (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-primary px-3.5 py-2 text-sm break-words whitespace-pre-wrap text-primary-foreground">
                        {m.content}
                      </div>
                    </div>
                  ) : (
                    <AssistantMessage
                      key={m.id}
                      msg={m}
                      copied={copiedId === m.id}
                      onCopy={copyMessage}
                      t={t}
                    />
                  ),
                )}
              </div>
            </div>
            <div className="shrink-0 border-t border-border/70 bg-card px-4 py-3">
              <div className="mx-auto w-full max-w-2xl">
                <Composer
                  inputRef={composerRef}
                  value={input}
                  onChange={setInput}
                  onSend={() => void send()}
                  pending={pending}
                  placeholder={t('agent.placeholder')}
                  sendLabel={t('assistant.send')}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* history panel — mobile sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="w-80 gap-0 p-0">
          <SheetTitle className="sr-only">{t('assistant.history')}</SheetTitle>
          <div className="h-full pt-2">
            <HistoryPanel {...historyProps} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
