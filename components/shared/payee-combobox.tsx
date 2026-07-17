'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icon } from '@/components/shared/icon';
import { useT } from '@/components/providers/settings-provider';
import { createPayee } from '@/lib/actions/payees';
import type { PayeeOption } from '@/lib/types';
import { ChevronsUpDown, Plus, User } from 'lucide-react';

/**
 * Creatable payee / income-source picker. Suggests saved payees and any names
 * already used on transactions; typing a new name lets you use it as free text
 * and quietly saves it so it's suggestable next time. The transaction keeps
 * storing `payee` as plain text — this just makes it selectable + custom.
 */
export function PayeeCombobox({
  value,
  onChange,
  payees,
  kind,
  placeholder,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  payees: PayeeOption[];
  kind?: 'income' | 'expense';
  placeholder?: string;
  id?: string;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const q = query.trim();
  const exact = payees.some((p) => p.name.toLowerCase() === q.toLowerCase());

  function choose(name: string) {
    onChange(name);
    setOpen(false);
    setQuery('');
  }

  async function create() {
    if (!q) return;
    choose(q);
    // persist for future suggestions (fire-and-forget; transaction stores text)
    void createPayee({ name: q, kind: kind ?? null });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              'w-full justify-between gap-2 font-normal',
              !value && 'text-muted-foreground',
            )}
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <User className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{value || placeholder || t('payee.pick')}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[var(--anchor-width)] min-w-56 p-0" align="start">
        <Command filter={(v, search) => (v.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
          <CommandInput value={query} onValueChange={setQuery} placeholder={t('payee.search')} />
          <CommandList>
            {payees.length === 0 && !q && <CommandEmpty>{t('payee.empty')}</CommandEmpty>}
            {q && !exact && (
              <CommandGroup>
                <CommandItem value={q} onSelect={create}>
                  <Plus className="size-4" />
                  {t('payee.create', { name: q })}
                </CommandItem>
              </CommandGroup>
            )}
            {payees.length > 0 && (
              <CommandGroup>
                {payees.map((p) => (
                  <CommandItem key={p.id ?? p.name} value={p.name} onSelect={() => choose(p.name)}>
                    {p.icon ? (
                      <Icon
                        name={p.icon}
                        className="size-3.5 text-muted-foreground"
                        style={{ color: p.color ?? undefined }}
                      />
                    ) : (
                      <User className="size-3.5 text-muted-foreground" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
