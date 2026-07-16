import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { cn, iconStrokeVars } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { getSettings } from "@/lib/data/settings";
import { getRatesMap } from "@/lib/data/rates";

export const metadata: Metadata = {
  title: {
    default: "Ample — personal finance",
    template: "%s · Ample",
  },
  description:
    "Ample — a beautifully-printed wealth statement you actually enjoy opening. Track accounts, budgets, goals and net worth.",
  applicationName: "Ample",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ea" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1712" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  const rates = await getRatesMap(settings.baseCurrency);

  return (
    <html
      lang={settings.language}
      suppressHydrationWarning
      data-font={settings.uiFont}
      style={
        {
          fontSize: `${settings.uiScale}%`,
          ...iconStrokeVars(settings.iconStroke),
        } as React.CSSProperties
      }
      className={cn(fontVariables, settings.hideAmounts && "privacy-on")}
    >
      <body className="min-h-dvh antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme={settings.theme}
          enableSystem
          disableTransitionOnChange
        >
          <SettingsProvider
            settings={{
              currency: settings.baseCurrency,
              locale: settings.locale,
              displayName: settings.displayName,
              firstDayOfWeek: settings.firstDayOfWeek,
              language: settings.language,
              uiFont: settings.uiFont,
              uiScale: settings.uiScale,
              iconStroke: settings.iconStroke,
              simulationActive: settings.simulationActive,
              simDate: settings.simDate ? settings.simDate.getTime() : null,
              rates,
              aiEnabled: settings.aiEnabled,
              aiProvider: settings.aiProvider,
            }}
            initialHideAmounts={settings.hideAmounts}
          >
            <TooltipProvider delay={200}>{children}</TooltipProvider>
            <div className="grain-overlay" aria-hidden />
            <Toaster />
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
