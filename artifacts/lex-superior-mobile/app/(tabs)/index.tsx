import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useListUpdates, useGetProviderStatus } from "@workspace/api-client-react";

import { COLORS } from "@/constants/colors";

const QUICK_ACCESS = [
  {
    title: "AI Council",
    subtitle: "Consult specialist AI advisors",
    icon: "users" as const,
    color: COLORS.primary,
    colorDim: COLORS.primaryDim,
    route: "/(tabs)/council" as const,
  },
  {
    title: "Documents",
    subtitle: "Draft court-ready documents",
    icon: "file-text" as const,
    color: COLORS.blue,
    colorDim: COLORS.blueDim,
    route: "/(tabs)/documents" as const,
  },
  {
    title: "Library",
    subtitle: "Statutes, cases & precedents",
    icon: "book-open" as const,
    color: COLORS.purple,
    colorDim: COLORS.purpleDim,
    route: "/(tabs)/library" as const,
  },
  {
    title: "Guides",
    subtitle: "Step-by-step procedures",
    icon: "map" as const,
    color: COLORS.green,
    colorDim: COLORS.greenDim,
    route: "/guides" as const,
  },
  {
    title: "Vault",
    subtitle: "Saved files & bookmarks",
    icon: "folder" as const,
    color: COLORS.amber,
    colorDim: COLORS.amberDim,
    route: "/(tabs)/vault" as const,
  },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 84 : 80;

  const { data: updatesData } = useListUpdates();
  const { data: providerStatus } = useGetProviderStatus();

  const updates = updatesData?.updates?.slice(0, 3) ?? [];
  const isAiOnline = (providerStatus?.providers ?? []).some((p) => p.available);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 16 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Text style={styles.logoText}>⚖</Text>
          <View>
            <Text style={styles.appName}>Lex Superior</Text>
            <Text style={styles.appTagline}>Superior Courts of Zimbabwe</Text>
          </View>
        </View>
        {providerStatus && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isAiOnline
                  ? COLORS.successDim
                  : COLORS.dangerDim,
                borderColor: isAiOnline
                  ? COLORS.success
                  : COLORS.danger,
              },
            ]}
          >
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isAiOnline
                    ? COLORS.success
                    : COLORS.danger,
                },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                {
                  color: isAiOnline
                    ? COLORS.success
                    : COLORS.danger,
                },
              ]}
            >
              {isAiOnline ? "AI Online" : "AI Offline"}
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.sectionLabel}>Quick Access</Text>

      <View style={styles.grid}>
        {QUICK_ACCESS.map((item) => (
          <Pressable
            key={item.title}
            style={({ pressed }) => [
              styles.card,
              { borderColor: item.colorDim, opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => router.push(item.route)}
          >
            <View
              style={[styles.iconCircle, { backgroundColor: item.colorDim }]}
            >
              <Feather name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      {updates.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Legal Updates</Text>
          <View style={styles.updatesList}>
            {updates.map((update, i) => (
              <View key={i} style={styles.updateCard}>
                <View style={styles.updateDot} />
                <View style={styles.updateContent}>
                  <Text style={styles.updateTitle} numberOfLines={2}>
                    {update.title}
                  </Text>
                  {update.summary && (
                    <Text style={styles.updateSummary} numberOfLines={3}>
                      {update.summary}
                    </Text>
                  )}
                  {update.date && (
                    <Text style={styles.updateDate}>{update.date}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={styles.footerNote}>
        <Feather name="shield" size={12} color={COLORS.textMuted} />
        <Text style={styles.footerText}>
          For legal research purposes only. Not formal legal advice.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoText: {
    fontSize: 28,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "Inter_600SemiBold",
    marginBottom: 12,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  card: {
    width: "47%",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  updatesList: {
    gap: 10,
    marginBottom: 28,
  },
  updateCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  updateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  updateContent: {
    flex: 1,
    gap: 4,
  },
  updateTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  updateSummary: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  updateDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    flex: 1,
  },
});
