import { Link } from "react-router";
import { Card, CardHeader, FormField, SegmentedControl, type Segment } from "@/components/molecules";
import { PageHeader, type SidebarProps } from "@/components/organisms";
import { SettingsLayout, type SettingsSection } from "@/components/templates";
import type { ThemePreference } from "@/features/settings/theme";
import { useTheme } from "@/features/settings/themeContext";

const sections: SettingsSection[] = [{ key: "general", label: "General", href: "/settings" }];

// The design's order.
const themeSegments: Segment<ThemePreference>[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

const renderLink: SidebarProps["renderLink"] = (href, props) => <Link to={href} {...props} />;

/** /settings: per-device preferences. Only General > Appearance (theme) for now. Changes apply right away. */
export function SettingsPage() {
  const { preference, setPreference } = useTheme();

  return (
    <>
      <PageHeader title="Settings" description="Your preferences. They are saved on this device." />
      <SettingsLayout sections={sections} active="general" renderLink={renderLink}>
        <Card>
          <CardHeader title="Appearance" />
          <FormField label="Theme" help="System follows your computer's setting.">
            <SegmentedControl aria-label="Theme" value={preference} onChange={setPreference} segments={themeSegments} />
          </FormField>
        </Card>
      </SettingsLayout>
    </>
  );
}
