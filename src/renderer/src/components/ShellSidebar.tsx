import { memo, useEffect, useState } from 'react'
import { Button, Label, ListBox } from '@heroui/react'
import type { Kategorie, UpdateInfo } from '@shared/types'
import { APP_NAME, APP_VERSION_LABEL } from '../lib/version'
import logoDarkUrl from '../assets/brand/verdict-lockup-dark.svg?url'
import logoLightUrl from '../assets/brand/verdict-lockup-light.svg?url'

interface ShellSidebarProps {
  kategorie: Kategorie[]
  activeCat: number | null
  onCat: (id: number) => void
  onZpet: () => void
  operator: string
  datum: string
}

export const ShellSidebar = memo(function ShellSidebar({
  kategorie,
  activeCat,
  onCat,
  onZpet,
  operator,
  datum
}: ShellSidebarProps): React.JSX.Element {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    return window.api.onUpdateAvailable((info) => setUpdateInfo(info))
  }, [])

  return (
    <aside className="flex w-sidebar shrink-0 flex-col h-full border-r border-border bg-surface">
      <div className="h-toolbar shrink-0 flex items-center px-4">
        <button
          type="button"
          onClick={onZpet}
          aria-label="Zpět na seznam závodů"
          className="flex h-7 cursor-pointer items-center border-none bg-transparent p-0 opacity-80 transition-opacity hover:opacity-100"
        >
          <img
            src={logoLightUrl}
            alt={APP_NAME}
            className="verdict-logo verdict-logo-light h-full w-auto"
          />
          <img
            src={logoDarkUrl}
            alt={APP_NAME}
            className="verdict-logo verdict-logo-dark h-full w-auto"
          />
        </button>
      </div>

      <div className="px-2.5 pb-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onPress={onZpet}
        >
          ← Závody
        </Button>
      </div>

      <div className="px-4 pb-1.5 text-[11px] font-semibold tracking-wide text-muted uppercase">
        Kategorie
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2.5">
        <ListBox
          aria-label="Kategorie závodu"
          selectionMode="single"
          selectedKeys={activeCat != null ? new Set([String(activeCat)]) : new Set()}
          onSelectionChange={(keys) => {
            const key = Array.from(keys)[0]
            if (key != null) onCat(Number(key))
          }}
          className="w-full"
        >
          {kategorie.map((c) => (
            <ListBox.Item key={c.id} id={String(c.id)} textValue={c.nazev}>
              <Label className="flex-1">{c.nazev}</Label>
              {c.pocet > 0 && (
                <span className="text-xs text-muted tabular-nums">{c.pocet}</span>
              )}
            </ListBox.Item>
          ))}
        </ListBox>
      </div>

      {updateInfo && (
        <div className="mx-2 mb-2 flex items-center gap-1 rounded-lg border border-border bg-accent/8 px-2.5 py-2 text-[11px]">
          <span className="flex-1 font-medium text-accent-foreground">
            Nová: {updateInfo.version}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-auto px-1.5 py-0.5 text-[11px]"
            onPress={() => window.api.openUrl(updateInfo.url).catch(() => {})}
          >
            Stáhnout
          </Button>
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label="Zavřít"
            className="size-5"
            onPress={() => {
              window.api.dismissUpdate(updateInfo.version).catch(() => {})
              setUpdateInfo(null)
            }}
          >
            ✕
          </Button>
        </div>
      )}

      <div className="border-t border-border px-4 py-2.5 flex items-center gap-2.5">
        <span className="size-7 shrink-0 rounded-full bg-default grid place-items-center text-[11px] font-semibold">
          V
        </span>
        <div className="flex flex-col leading-[1.3] min-w-0">
          <span className="text-[12.5px] font-semibold truncate">{operator}</span>
          <span className="text-[11.5px] text-muted tabular-nums">{datum}</span>
        </div>
      </div>

      <div className="px-4 pb-2.5 text-center text-[10.5px] text-muted tracking-wide whitespace-nowrap">
        {APP_NAME} <span className="tabular-nums">{APP_VERSION_LABEL}</span>
      </div>
    </aside>
  )
})
