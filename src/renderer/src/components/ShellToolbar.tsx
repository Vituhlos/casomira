import { ChevronDown, Gear, Moon, Sun } from '@gravity-ui/icons'
import { Breadcrumbs, Button, ButtonGroup, Dropdown, Label } from '@heroui/react'

interface ShellToolbarProps {
  catLabel: string
  phaseLabel: string
  theme: string
  onToggleTheme: () => void
  onPdf: () => void
  onPdfSaveAs: () => void
  onOpenPdfFolder: () => void
  onPrint: (shiftKey?: boolean) => void
  onStopky: () => void
  onSettings: () => void
}

export function ShellToolbar({
  catLabel,
  phaseLabel,
  theme,
  onToggleTheme,
  onPdf,
  onPdfSaveAs,
  onOpenPdfFolder,
  onPrint,
  onStopky,
  onSettings
}: ShellToolbarProps): React.JSX.Element {
  return (
    <header className="flex h-toolbar shrink-0 items-center gap-3 border-b border-border bg-surface px-4">
      {catLabel ? (
        <Breadcrumbs>
          <Breadcrumbs.Item>{catLabel}</Breadcrumbs.Item>
          <Breadcrumbs.Item>{phaseLabel}</Breadcrumbs.Item>
        </Breadcrumbs>
      ) : (
        <span className="text-sm font-medium">{phaseLabel}</span>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={theme === 'dark' ? 'Přepnout na světlý motiv' : 'Přepnout na tmavý motiv'}
          onPress={onToggleTheme}
        >
          {theme === 'dark' ? <Sun width={15} height={15} /> : <Moon width={15} height={15} />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label="Nastavení"
          onPress={onSettings}
        >
          <Gear width={15} height={15} />
        </Button>

        <Button variant="secondary" size="sm" onPress={onStopky}>
          Stopky
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onPress={(e) => onPrint(e.shiftKey)}
        >
          Tisknout
        </Button>

        <ButtonGroup>
          <Button size="sm" onPress={onPdf}>
            Uložit PDF
          </Button>
          <Dropdown>
            <Button size="sm" isIconOnly aria-label="Další možnosti PDF" className="rounded-s-none">
              <ButtonGroup.Separator />
              <ChevronDown width={14} height={14} />
            </Button>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'save-as') onPdfSaveAs()
                  else if (key === 'open-folder') onOpenPdfFolder()
                }}
              >
                <Dropdown.Item id="save-as" textValue="Uložit jako...">
                  <Label>Uložit jako...</Label>
                </Dropdown.Item>
                <Dropdown.Item id="open-folder" textValue="Otevřít složku PDF">
                  <Label>Otevřít složku PDF</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </ButtonGroup>
      </div>
    </header>
  )
}
