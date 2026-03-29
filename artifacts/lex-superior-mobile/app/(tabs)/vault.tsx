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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  useListVaultFiles,
  useDeleteVaultFile,
  useListBookmarks,
} from "@workspace/api-client-react";

import { COLORS } from "@/constants/colors";

function getFileIconProps(name: string): { icon: string; color: string; bg: string } {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: "file-text", color: COLORS.danger, bg: COLORS.dangerDim };
  if (ext === "doc" || ext === "docx") return { icon: "file-text", color: COLORS.blue, bg: COLORS.blueDim };
  if (ext === "txt") return { icon: "file", color: COLORS.textSecondary, bg: COLORS.card };
  return { icon: "file", color: COLORS.primary, bg: COLORS.primaryDim };
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type VaultTab = "files" | "bookmarks";

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 84 : insets.bottom;

  const [activeTab, setActiveTab] = useState<VaultTab>("files");
  const [search, setSearch] = useState("");
  const [committedSearch, setCommittedSearch] = useState("");

  const {
    data: filesData,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = useListVaultFiles(committedSearch ? { search: committedSearch } : undefined);

  const { data: bookmarksData, isLoading: bookmarksLoading } = useListBookmarks();

  const { mutate: deleteFile } = useDeleteVaultFile({
    mutation: {
      onSuccess: () => refetchFiles(),
    },
  });

  function handleDeleteFile(id: string, name: string) {
    Alert.alert(
      "Delete File",
      `Remove "${name}" from vault?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteFile({ id }),
        },
      ]
    );
  }

  const vaultFiles = filesData?.files ?? [];
  const savedBookmarks = bookmarksData?.bookmarks ?? [];

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
      <Text style={styles.screenTitle}>Vault</Text>
      <Text style={styles.screenSubtitle}>
        Your saved files, documents, and bookmarks
      </Text>

      <View style={styles.tabsRow}>
        {(["files", "bookmarks"] as VaultTab[]).map((tab) => {
          const isActive = activeTab === tab;
          const label = tab === "files" ? "Files" : "Bookmarks";
          const icon = tab === "files" ? "folder" : "bookmark";
          return (
            <Pressable
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => {
                setActiveTab(tab);
                setSearch("");
                setCommittedSearch("");
              }}
            >
              <Feather
                name={icon as any}
                size={14}
                color={isActive ? COLORS.primary : COLORS.textMuted}
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === "files" && (
        <>
          <View style={styles.searchRow}>
            <Feather name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search files..."
              placeholderTextColor={COLORS.textMuted}
              onSubmitEditing={() => setCommittedSearch(search.trim())}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearch("");
                  setCommittedSearch("");
                }}
              >
                <Feather name="x" size={14} color={COLORS.textMuted} />
              </Pressable>
            )}
          </View>

          {filesLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : vaultFiles.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="folder" size={32} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No files yet</Text>
              <Text style={styles.emptyDesc}>
                Generated documents and saved files will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {vaultFiles.map((file) => {
                const iconProps = getFileIconProps(file.name);
                return (
                  <View key={file.id} style={styles.fileCard}>
                    <View
                      style={[styles.fileIconBg, { backgroundColor: iconProps.bg }]}
                    >
                      <Feather
                        name={iconProps.icon as any}
                        size={18}
                        color={iconProps.color}
                      />
                    </View>
                    <View style={styles.fileContent}>
                      <Text style={styles.fileName} numberOfLines={2}>
                        {file.name}
                      </Text>
                      <View style={styles.fileMeta}>
                        {file.fileType && (
                          <Text style={styles.fileMetaText}>{file.fileType.toUpperCase()}</Text>
                        )}
                        {file.fileSize != null && (
                          <Text style={styles.fileMetaText}>
                            {formatFileSize(file.fileSize)}
                          </Text>
                        )}
                        <Text style={styles.fileMetaText}>{file.folder}</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteFile(file.id, file.name)}
                      style={styles.deleteBtn}
                    >
                      <Feather name="trash-2" size={16} color={COLORS.danger} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {activeTab === "bookmarks" && (
        <>
          {bookmarksLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : savedBookmarks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="bookmark" size={32} color={COLORS.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No bookmarks yet</Text>
              <Text style={styles.emptyDesc}>
                Bookmark statutes, cases, and precedents from the Library to access them quickly.
              </Text>
            </View>
          ) : (
            <View style={styles.itemsList}>
              {savedBookmarks.map((bm) => (
                <View key={bm.id} style={styles.bookmarkCard}>
                  <View style={styles.bookmarkIconBg}>
                    <Feather name="bookmark" size={16} color={COLORS.amber} />
                  </View>
                  <View style={styles.fileContent}>
                    <Text style={styles.fileName} numberOfLines={2}>
                      {bm.title}
                    </Text>
                    <Text style={styles.bookmarkType}>{bm.type}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
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
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  itemsList: {
    gap: 10,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  fileIconBg: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileContent: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  fileMeta: {
    flexDirection: "row",
    gap: 8,
  },
  fileMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
  },
  deleteBtn: {
    padding: 8,
  },
  bookmarkCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  bookmarkIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.amberDim,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bookmarkType: {
    fontSize: 11,
    color: COLORS.amber,
    fontFamily: "Inter_400Regular",
    backgroundColor: COLORS.amberDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
    textTransform: "capitalize",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
  },
});
