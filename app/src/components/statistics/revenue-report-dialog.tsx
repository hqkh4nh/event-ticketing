import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { themes } from "@/design/themes";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTokens } from "@/hooks/use-tokens";
import { toUserMessage } from "@/lib/api/error-message";
import {
  downloadRevenueReport,
  type RevenueReportScope,
  type RevenueReportType,
} from "@/lib/api/statistics";
import { saveRevenueReport } from "@/lib/revenue-report-file";

import { ReportDateInput } from "./report-date-input";

type DatePreset = "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_REPORT_DAYS = 366;
const PRESETS: readonly DatePreset[] = [
  "LAST_7_DAYS",
  "LAST_30_DAYS",
  "THIS_MONTH",
  "CUSTOM",
];
export function RevenueReportDialog({
  visible,
  scope,
  onClose,
}: {
  visible: boolean;
  scope: RevenueReportScope;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const initialRange = getPresetRange("LAST_30_DAYS");
  const [preset, setPreset] = useState<DatePreset>("LAST_30_DAYS");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [exporting, setExporting] = useState<RevenueReportType | null>(null);
  const [message, setMessage] = useState<
    { tone: "success" | "error"; text: string } | undefined
  >();
  const rangeDays = getInclusiveDays(from, to);
  const rangeInvalid = rangeDays < 1 || rangeDays > MAX_REPORT_DAYS;

  useEffect(() => {
    if (!visible) return;
    const range = getPresetRange("LAST_30_DAYS");
    setPreset("LAST_30_DAYS");
    setFrom(range.from);
    setTo(range.to);
    setExporting(null);
    setMessage(undefined);
  }, [visible]);

  function selectPreset(nextPreset: DatePreset) {
    setPreset(nextPreset);
    setMessage(undefined);
    if (nextPreset === "CUSTOM") return;
    const range = getPresetRange(nextPreset);
    setFrom(range.from);
    setTo(range.to);
  }

  async function exportReport(type: RevenueReportType) {
    if (rangeInvalid || exporting) return;
    setExporting(type);
    setMessage(undefined);
    try {
      const report = await downloadRevenueReport(
        scope,
        {
          type,
          from: toDateKey(from),
          to: toDateKey(to),
        },
        i18n.resolvedLanguage ?? i18n.language,
      );
      await saveRevenueReport(report, t("statistics.export.shareTitle"));
      setMessage({ tone: "success", text: t("statistics.export.success") });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error && error.message === "FILE_SHARING_UNAVAILABLE"
            ? t("statistics.export.sharingUnavailable")
            : toUserMessage(error, t),
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View className="flex-1 justify-end">
        <Pressable
          accessibilityLabel={t("common.cancel")}
          accessibilityRole="button"
          className="absolute inset-0 bg-black/50"
          onPress={onClose}
        />
        <SafeAreaView
          accessibilityViewIsModal
          edges={["bottom"]}
          style={[themes[colorScheme], { maxHeight: "86%" }]}
          className="w-full overflow-hidden rounded-t-xl bg-surface"
        >
          <View className="min-h-touch-target-min flex-row items-center justify-between border-b border-outline-variant px-container-padding py-2">
            <View className="min-w-0 flex-1">
              <Text className="font-semibold text-headline-md text-on-surface">
                {t("statistics.export.title")}
              </Text>
              <Text className="font-sans text-label-sm text-on-surface-variant">
                {t("statistics.export.description")}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={t("common.cancel")}
              accessibilityRole="button"
              className="h-touch-target-min w-touch-target-min items-center justify-center rounded-full active:bg-surface-container"
              onPress={onClose}
            >
              <MaterialIcons
                name="close"
                size={24}
                className="text-on-surface"
              />
            </Pressable>
          </View>

          <ScrollView
            className="shrink"
            contentContainerClassName="gap-6 px-container-padding py-5"
          >
            <View className="gap-3">
              <Text className="font-semibold text-body-lg text-on-surface">
                {t("statistics.export.period")}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {PRESETS.map((option) => {
                  const selected = option === preset;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      className={[
                        "min-h-touch-target-min justify-center rounded-full border px-4",
                        selected
                          ? "border-primary bg-primary-container"
                          : "border-outline-variant bg-surface-container-lowest",
                      ].join(" ")}
                      onPress={() => selectPreset(option)}
                    >
                      <Text
                        className={[
                          "font-semibold text-label-md",
                          selected
                            ? "text-on-primary-container"
                            : "text-on-surface-variant",
                        ].join(" ")}
                      >
                        {t(`statistics.export.preset.${option}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="flex-row gap-3">
              <ReportDateField
                label={t("statistics.export.from")}
                value={from}
                onChange={(date) => {
                  setPreset("CUSTOM");
                  setFrom(date);
                  setMessage(undefined);
                }}
              />
              <ReportDateField
                label={t("statistics.export.to")}
                value={to}
                onChange={(date) => {
                  setPreset("CUSTOM");
                  setTo(date);
                  setMessage(undefined);
                }}
              />
            </View>

            <View
              className={[
                "flex-row items-start gap-2 rounded-lg px-3 py-2",
                rangeInvalid ? "bg-error-container" : "bg-surface-container",
              ].join(" ")}
            >
              <MaterialIcons
                name={rangeInvalid ? "error-outline" : "date-range"}
                size={18}
                className={rangeInvalid ? "text-error" : "text-primary"}
              />
              <Text
                className={[
                  "flex-1 font-sans text-label-sm",
                  rangeInvalid
                    ? "text-on-error-container"
                    : "text-on-surface-variant",
                ].join(" ")}
              >
                {rangeInvalid
                  ? t("statistics.export.invalidRange", {
                      max: MAX_REPORT_DAYS,
                    })
                  : t("statistics.export.rangeSummary", { count: rangeDays })}
              </Text>
            </View>

            <View className="gap-3">
              <Text className="font-semibold text-body-lg text-on-surface">
                {t("statistics.export.reportType")}
              </Text>
              <ReportTypeButton
                description={t("statistics.export.summaryDescription")}
                disabled={rangeInvalid || exporting !== null}
                icon="summarize"
                label={t("statistics.export.summary")}
                loading={exporting === "SUMMARY"}
                onPress={() => void exportReport("SUMMARY")}
              />
              <ReportTypeButton
                description={t("statistics.export.detailDescription")}
                disabled={rangeInvalid || exporting !== null}
                icon="receipt-long"
                label={t("statistics.export.detail")}
                loading={exporting === "DETAIL"}
                onPress={() => void exportReport("DETAIL")}
              />
            </View>

            {message ? <StatusMessage {...message} /> : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ReportDateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (date: Date) => void;
}) {
  const { i18n } = useTranslation();
  const tokens = useTokens();
  const colorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const locale = i18n.language.startsWith("vi") ? "vi-VN" : "en-US";

  function openAndroidPicker() {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      display: "calendar",
      onChange: (event: DateTimePickerEvent, selected?: Date) => {
        if (event.type === "set" && selected) onChange(atLocalNoon(selected));
      },
    });
  }

  return (
    <View className="min-w-0 flex-1 gap-2">
      <Text className="font-medium text-label-md text-on-surface-variant">
        {label}
      </Text>
      {Platform.OS === "web" ? (
        <ReportDateInput
          label={label}
          value={toDateKey(value)}
          onChange={(dateKey) => {
            const date = fromDateKey(dateKey);
            if (date) onChange(date);
          }}
        />
      ) : Platform.OS === "android" ? (
        <Pressable
          accessibilityLabel={label}
          accessibilityRole="button"
          className="h-touch-target-min flex-row items-center gap-2 rounded-md border border-outline bg-surface-container-lowest px-3 active:opacity-70"
          onPress={openAndroidPicker}
        >
          <MaterialIcons
            name="calendar-today"
            size={18}
            className="text-primary"
          />
          <Text
            adjustsFontSizeToFit
            className="flex-1 font-medium text-label-md text-on-surface"
            numberOfLines={1}
          >
            {formatDisplayDate(value, locale)}
          </Text>
        </Pressable>
      ) : (
        <View className="min-h-touch-target-min items-center justify-center rounded-md border border-outline bg-surface-container-lowest px-2">
          <DateTimePicker
            accentColor={tokens.primary}
            display="compact"
            locale={locale}
            mode="date"
            themeVariant={colorScheme}
            value={value}
            onChange={(event, selected) => {
              if (event.type === "set" && selected)
                onChange(atLocalNoon(selected));
            }}
          />
        </View>
      )}
    </View>
  );
}

function ReportTypeButton({
  icon,
  label,
  description,
  loading,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  description: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      className={[
        "min-h-20 flex-row items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 active:bg-surface-container",
        disabled ? "opacity-50" : "",
      ].join(" ")}
      onPress={onPress}
    >
      <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary-container">
        {loading ? (
          <ActivityIndicator className="text-primary" />
        ) : (
          <MaterialIcons name={icon} size={23} className="text-primary" />
        )}
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-semibold text-body-md text-on-surface">
          {label}
        </Text>
        <Text className="font-sans text-label-sm text-on-surface-variant">
          {description}
        </Text>
      </View>
      <MaterialIcons name="file-download" size={22} className="text-primary" />
    </Pressable>
  );
}

function StatusMessage({
  tone,
  text,
}: {
  tone: "success" | "error";
  text: string;
}) {
  const success = tone === "success";
  return (
    <View
      className={`flex-row items-center gap-2 rounded-lg px-3 py-3 ${success ? "bg-success-container" : "bg-error-container"}`}
    >
      <MaterialIcons
        name={success ? "check-circle" : "error"}
        size={20}
        className={success ? "text-success" : "text-error"}
      />
      <Text
        className={`flex-1 font-medium text-label-md ${success ? "text-on-success-container" : "text-on-error-container"}`}
      >
        {text}
      </Text>
    </View>
  );
}

function getPresetRange(preset: Exclude<DatePreset, "CUSTOM">) {
  const to = getVietnamToday();
  if (preset === "THIS_MONTH") {
    return { from: new Date(to.getFullYear(), to.getMonth(), 1, 12), to };
  }
  const days = preset === "LAST_7_DAYS" ? 7 : 30;
  return {
    from: new Date(
      to.getFullYear(),
      to.getMonth(),
      to.getDate() - days + 1,
      12,
    ),
    to,
  };
}

function getVietnamToday(): Date {
  const vietnam = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(
    vietnam.getUTCFullYear(),
    vietnam.getUTCMonth(),
    vietnam.getUTCDate(),
    12,
  );
}

function atLocalNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
  );
  return toDateKey(date) === value ? date : null;
}

function getInclusiveDays(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((toUtc - fromUtc) / DAY_MS) + 1;
}

function formatDisplayDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}
