import { Card, CardHeader, FormField, SegmentedControl, type Segment } from "@/components/molecules";
import type { ThemePreference } from "@/features/settings/theme";
import { SettingsFrame } from "@/features/settings/SettingsFrame";
import { useTheme } from "@/features/settings/themeContext";

// The design's order.
const themeSegments: Segment<ThemePreference>[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

/** /settings: the General tab, per-device preferences. Only Appearance (theme) for now. Changes apply right away. */
export function SettingsPage() {
  const { preference, setPreference } = useTheme();

  return (
    <SettingsFrame active="general">
      <Card>
        <CardHeader title="Appearance" description="Saved on this device." />
        <FormField label="Theme" help="System follows your computer's setting.">
          <SegmentedControl aria-label="Theme" value={preference} onChange={setPreference} segments={themeSegments} />
        </FormField>
      </Card>
    </SettingsFrame>
  );
}
