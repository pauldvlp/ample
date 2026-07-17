import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { SettingsForm } from '@/components/settings/settings-form';
import { AiSettings } from '@/components/settings/ai-settings';
import { ReplayTourButton } from '@/components/onboarding/replay-tour-button';
import { PageTutorials } from '@/components/onboarding/page-tutorials';
import { DataManagement } from '@/components/settings/data-management';
import { getSettings } from '@/lib/data/settings';
import { getUsedCurrencies } from '@/lib/data/rates';
import { getT } from '@/lib/i18n/server';

export const metadata = {
  title: 'Settings',
};

export default async function SettingsPage() {
  const [settings, usedCurrencies, t] = await Promise.all([
    getSettings(),
    getUsedCurrencies(),
    getT(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('nav.settings')}
        description={t('settings.description')}
      />

      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div data-tour="settings-general" className="space-y-4">
          <SettingsForm settings={settings} usedCurrencies={usedCurrencies} />
        </div>

        <AiSettings
          enabled={settings.aiEnabled}
          provider={settings.aiProvider}
          model={settings.aiModel}
          hasKey={!!settings.aiApiKey}
        />

        <DataManagement />

        <SectionCard
          title={t('settings.about.title')}
          description={t('settings.about.description')}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="font-display text-lg leading-none text-foreground">Ample</p>
                <p className="text-xs text-muted-foreground">{t('settings.about.subtitle')}</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 font-ledger text-xs text-muted-foreground tnum">
                v1.0.0
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t('settings.about.body')}</p>
            <div data-tour="settings-help" className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{t('tour.replayTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('tour.replayHint')}</p>
                </div>
                <ReplayTourButton />
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
                <div className="mb-2.5 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{t('help.tutorialsTitle')}</p>
                  <p className="text-xs text-muted-foreground">{t('help.tutorialsHint')}</p>
                </div>
                <PageTutorials />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 border-t border-border/70 pt-4 text-xs">
              <div className="space-y-0.5">
                <dt className="text-muted-foreground">{t('settings.about.storage')}</dt>
                <dd className="font-medium text-foreground">{t('settings.about.storageValue')}</dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-muted-foreground">{t('settings.about.sync')}</dt>
                <dd className="font-medium text-foreground">{t('settings.about.syncValue')}</dd>
              </div>
            </dl>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
