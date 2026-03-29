import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useListStatutes,
  useListCases,
  useListPrecedents,
} from "@workspace/api-client-react";

import { COLORS } from "@/constants/colors";

type LibTab = "statutes" | "cases" | "precedents";

const LIB_TABS: { id: LibTab; label: string; icon: string }[] = [
  { id: "statutes", label: "Statutes", icon: "book" },
  { id: "cases", label: "Cases", icon: "briefcase" },
  { id: "precedents", label: "Precedents", icon: "archive" },
];

function StatutesList({ search }: { search: string }) {
  const { data, isLoading, error } = useListStatutes(
    search ? { search } : undefined
  );

  if (isLoading) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />;
  }

  if (error) {
    return (
      <Text style={styles.errorText}>Failed to load statutes. Check connection.</Text>
    );
  }

  const statutes = data?.statutes ?? [];

  if (statutes.length === 0) {
    return (
      <Text style={styles.emptyText}>
        {search ? `No statutes matching "${search}"` : "No statutes found."}
      </Text>
    );
  }

  return (
    <View style={styles.itemsList}>
      {statutes.map((statute) => (
        <View key={statute.id} style={styles.itemCard}>
          <View style={styles.itemIconBg}>
            <Feather name="book" size={16} color={COLORS.blue} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>{statute.title}</Text>
            {statute.chapter && (
              <Text style={styles.itemBadge}>Chapter {statute.chapter}</Text>
            )}
            {statute.category && (
              <Text style={styles.metaText}>{statute.category}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function CasesList({ search }: { search: string }) {
  const { data, isLoading, error } = useListCases(
    search ? { search } : undefined
  );

  if (isLoading) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />;
  }

  if (error) {
    return (
      <Text style={styles.errorText}>Failed to load cases. Check connection.</Text>
    );
  }

  const cases = data?.cases ?? [];

  if (cases.length === 0) {
    return (
      <Text style={styles.emptyText}>
        {search ? `No cases matching "${search}"` : "No cases found."}
      </Text>
    );
  }

  return (
    <View style={styles.itemsList}>
      {cases.map((c) => (
        <View key={c.id} style={styles.itemCard}>
          <View style={[styles.itemIconBg, { backgroundColor: COLORS.purpleDim }]}>
            <Feather name="briefcase" size={16} color={COLORS.purple} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>{c.title}</Text>
            <View style={styles.itemMeta}>
              <Text style={styles.metaText}>{c.court}</Text>
              {c.year != null && (
                <Text style={styles.metaText}>{c.year}</Text>
              )}
              <Text style={[styles.metaText, { color: COLORS.purple }]}>
                {c.citation}
              </Text>
            </View>
            {c.headnote && (
              <Text style={styles.itemHeadnote} numberOfLines={2}>
                {c.headnote}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function PrecedentsList({ search }: { search: string }) {
  const { data, isLoading, error } = useListPrecedents(
    search ? { q: search } : undefined
  );

  if (isLoading) {
    return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />;
  }

  if (error) {
    return (
      <Text style={styles.errorText}>Failed to load precedents. Check connection.</Text>
    );
  }

  const precedents = data?.precedents ?? [];

  if (precedents.length === 0) {
    return (
      <Text style={styles.emptyText}>
        {search ? `No precedents matching "${search}"` : "No precedents found."}
      </Text>
    );
  }

  return (
    <View style={styles.itemsList}>
      {precedents.map((p) => (
        <View key={p.id} style={styles.itemCard}>
          <View style={[styles.itemIconBg, { backgroundColor: COLORS.amberDim }]}>
            <Feather name="archive" size={16} color={COLORS.amber} />
          </View>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle}>{p.title}</Text>
            <View style={styles.itemMeta}>
              {p.category && (
                <Text style={[styles.metaText, { color: COLORS.amber }]}>
                  {p.category}
                </Text>
              )}
              <Text style={styles.metaText}>{p.source}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 84 : insets.bottom;

  const [activeTab, setActiveTab] = useState<LibTab>("statutes");
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");

  function handleSearch() {
    setCommittedSearch(search.trim());
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: bottomPad + 80 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>Legal Library</Text>
      <Text style={styles.screenSubtitle}>
        Search Zimbabwe's statutes, case law, and legal precedents
      </Text>

      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={COLORS.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${activeTab}...`}
          placeholderTextColor={COLORS.textMuted}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => {
              setSearch("");
              setCommittedSearch("");
            }}
            style={styles.clearBtn}
          >
            <Feather name="x" size={14} color={COLORS.textMuted} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {LIB_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab.id);
                setCommittedSearch("");
                setSearch("");
              }}
            >
              <Feather
                name={tab.icon as any}
                size={14}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === "statutes" && <StatutesList search={committedSearch} />}
      {activeTab === "cases" && <CasesList search={committedSearch} />}
      {activeTab === "precedents" && <PrecedentsList search={committedSearch} />}
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
  screenTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 46,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  tabsScroll: {
    marginBottom: 16,
  },
  tabsRow: {
    gap: 8,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  tabActive: {
    borderColor: COLORS.primaryBorder,
    backgroundColor: COLORS.primaryDim,
  },
  tabText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: "Inter_500Medium",
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: "flex-start",
  },
  itemIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.blueDim,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 20,
  },
  itemBadge: {
    fontSize: 11,
    color: COLORS.blue,
    fontFamily: "Inter_400Regular",
    backgroundColor: COLORS.blueDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  itemMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
  },
  itemHeadnote: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    marginTop: 2,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 20,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 40,
  },
});
