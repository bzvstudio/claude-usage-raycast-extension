import {
  environment,
  getPreferenceValues,
  Keyboard,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
  type LaunchProps,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { refresh } from "./lib/refresh";
import { oauthSource } from "./lib/usage-api";
import { readSnapshot, writeSnapshot } from "./lib/usage-store";
import { deriveView, errorBanner } from "./lib/view";
import type { Prefs, Snapshot } from "./types";

const USAGE_PAGE = "https://claude.ai/settings/usage";

type LaunchContext = { force?: boolean };

export default function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  const prefs = getPreferenceValues<Prefs>();
  // Cache-first: render the last known value synchronously, no flicker.
  const [snap, setSnap] = useState<Snapshot>(() => readSnapshot());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const force = props.launchContext?.force === true;
    const userInitiated = environment.launchType === LaunchType.UserInitiated;

    (async () => {
      const next = await refresh(snap, oauthSource(prefs.credentialsSource), {
        force,
        userInitiated,
        signal: AbortSignal.timeout(10_000),
      });
      if (next !== snap) writeSnapshot(next);
      if (!cancelled) setSnap(next);
      // Toasts/HUDs only for an explicit "Refresh Now", never for background runs.
      if (force && next.lastError) {
        await showHUD(errorBanner(next.lastError.kind, next.backoffUntil, prefs.credentialsSource));
      }
    })()
      .catch(() => undefined)
      // ALWAYS release isLoading, otherwise Raycast never unloads the command.
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const view = deriveView(snap, prefs, Date.now());

  return (
    <MenuBarExtra icon={{ source: view.icon }} title={view.title} tooltip={view.tooltip} isLoading={isLoading}>
      {view.banners.length > 0 && (
        <MenuBarExtra.Section>
          {view.banners.map((b) => (
            <MenuBarExtra.Item key={b} title={b} />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {view.rows.map((r) => (
          <MenuBarExtra.Item
            key={r.key}
            icon={{ source: r.icon }}
            title={r.title}
            subtitle={r.subtitle}
            onAction={() => open(USAGE_PAGE)}
          />
        ))}
      </MenuBarExtra.Section>

      {view.extraRows.length > 0 && (
        <MenuBarExtra.Section>
          {view.extraRows.map((r) => (
            <MenuBarExtra.Item
              key={r.key}
              icon={{ source: r.icon }}
              title={r.title}
              subtitle={r.subtitle}
              onAction={() => open(USAGE_PAGE)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      <MenuBarExtra.Section>
        {view.planLabel && <MenuBarExtra.Item title={view.planLabel} />}
        <MenuBarExtra.Item title={view.updatedLabel} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh Now"
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() =>
            launchCommand({
              name: "usage-menu-bar",
              type: LaunchType.UserInitiated,
              context: { force: true } satisfies LaunchContext,
            })
          }
        />
        <MenuBarExtra.Item title="Open Usage on claude.ai" onAction={() => open(USAGE_PAGE)} />
        <MenuBarExtra.Item title="Preferences…" onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
