import React, { useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import { useQuery } from "@tanstack/react-query";

import { COLORS, MEMBER_COLORS } from "@/constants/colors";
import { MarkdownText } from "@/components/MarkdownText";
import { getApiUrl } from "@/lib/query-client";

interface CouncilMember {
  id: string;
  name: string;
  title: string;
  specialty: string;
  description: string;
  icon: string;
  color: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  flags?: Array<{ type: string; text: string }>;
}

let messageCounter = 0;
function genId(): string {
  messageCounter++;
  return `msg-${Date.now()}-${messageCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

const ICON_MAP: Record<string, string> = {
  Scale: "users",
  FileText: "file-text",
  BookOpen: "book-open",
  ClipboardList: "clipboard",
  Landmark: "home",
};

function MemberCard({
  member,
  onSelect,
}: {
  member: CouncilMember;
  onSelect: () => void;
}) {
  const colors = MEMBER_COLORS[member.color] ?? MEMBER_COLORS.gold;
  const iconName = (ICON_MAP[member.icon] ?? "users") as any;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.memberCard,
        { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={onSelect}
    >
      <View style={[styles.memberIconBg, { backgroundColor: colors.bg }]}>
        <Feather name={iconName} size={24} color={colors.text} />
      </View>
      <Text style={[styles.memberName, { color: colors.text }]}>
        {member.name}
      </Text>
      <Text style={styles.memberTitle}>{member.title}</Text>
      <Text style={styles.memberDesc} numberOfLines={3}>
        {member.description}
      </Text>
      <View style={[styles.selectBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Text style={[styles.selectBtnText, { color: colors.text }]}>Consult</Text>
        <Feather name="arrow-right" size={14} color={colors.text} />
      </View>
    </Pressable>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <View style={styles.typingDot} />
      <View style={[styles.typingDot, { opacity: 0.6 }]} />
      <View style={[styles.typingDot, { opacity: 0.3 }]} />
    </View>
  );
}

function MessageBubble({ message, memberColor }: { message: Message; memberColor: string }) {
  const isUser = message.role === "user";
  const colors = MEMBER_COLORS[memberColor] ?? MEMBER_COLORS.gold;

  if (isUser) {
    return (
      <View style={styles.userBubbleRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userBubbleText}>{message.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiBubbleRow}>
      <View style={[styles.aiIconSmall, { backgroundColor: colors.bg }]}>
        <Feather name="cpu" size={12} color={colors.text} />
      </View>
      <View style={styles.aiBubble}>
        <MarkdownText content={message.content} />
        {message.flags && message.flags.length > 0 && (
          <View style={styles.flagsRow}>
            {message.flags.map((flag, i) => (
              <View key={i} style={styles.flagBadge}>
                <Text style={styles.flagText}>{flag.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

export default function CouncilScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 84 : insets.bottom;

  const [selectedMember, setSelectedMember] = useState<CouncilMember | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [consultationId, setConsultationId] = useState<string | undefined>();
  const inputRef = useRef<TextInput>(null);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["council-members"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/council/members`);
      if (!res.ok) throw new Error("Failed to load council members");
      return res.json() as Promise<CouncilMember[]>;
    },
  });

  async function handleSend() {
    if (!input.trim() || isStreaming || !selectedMember) return;

    const text = input.trim();
    setInput("");

    const currentMessages = [...messages];
    const userMsg: Message = { id: genId(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = "";
    let assistantAdded = false;
    let newConsultationId = consultationId;

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}api/council/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          message: text,
          memberId: selectedMember.id,
          consultationId: newConsultationId,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);

            if (parsed.consultationId && !newConsultationId) {
              newConsultationId = parsed.consultationId;
              setConsultationId(parsed.consultationId);
            }

            if (parsed.content) {
              fullContent += parsed.content;

              if (!assistantAdded) {
                setShowTyping(false);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: genId(),
                    role: "assistant",
                    content: fullContent,
                    flags: parsed.flags,
                  },
                ]);
                assistantAdded = true;
              } else {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullContent,
                  };
                  return updated;
                });
              }
            }

            if (parsed.done && parsed.flags) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  flags: parsed.flags,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setShowTyping(false);
      if (!assistantAdded) {
        setMessages((prev) => [
          ...prev,
          {
            id: genId(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
          },
        ]);
      }
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }

  function handleBack() {
    setSelectedMember(null);
    setMessages([]);
    setConsultationId(undefined);
    setInput("");
  }

  if (!selectedMember) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.selectorContent,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 80 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>AI Council</Text>
        <Text style={styles.screenSubtitle}>
          Select a specialist advisor for your legal research
        </Text>

        {membersLoading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.membersGrid}>
            {(members ?? []).map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                onSelect={() => {
                  setSelectedMember(m);
                  setMessages([]);
                  setConsultationId(undefined);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  const colors = MEMBER_COLORS[selectedMember.color] ?? MEMBER_COLORS.gold;
  const reversedMessages = [...messages].reverse();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { flex: 1 }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.chatHeader, { paddingTop: topPad + 8 }]}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={COLORS.textSecondary} />
        </Pressable>
        <View style={[styles.chatAvatarSmall, { backgroundColor: colors.bg }]}>
          <Feather
            name={(ICON_MAP[selectedMember.icon] ?? "users") as any}
            size={16}
            color={colors.text}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.chatHeaderName, { color: colors.text }]}>
            {selectedMember.name}
          </Text>
          <Text style={styles.chatHeaderTitle}>{selectedMember.title}</Text>
        </View>
      </View>

      {messages.length === 0 && !showTyping ? (
        <View style={styles.emptyChat}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.bg }]}>
            <Feather
              name={(ICON_MAP[selectedMember.icon] ?? "users") as any}
              size={32}
              color={colors.text}
            />
          </View>
          <Text style={styles.emptyTitle}>{selectedMember.name}</Text>
          <Text style={styles.emptyDesc}>{selectedMember.description}</Text>
        </View>
      ) : (
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble message={item} memberColor={selectedMember.color} />
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View
        style={[styles.inputBar, { paddingBottom: bottomPad + 4 }]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={`Ask ${selectedMember.name}...`}
          placeholderTextColor={COLORS.textMuted}
          multiline
          maxLength={2000}
          blurOnSubmit={false}
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: isStreaming || !input.trim() ? COLORS.border : COLORS.primary },
          ]}
          onPress={() => {
            handleSend();
            inputRef.current?.focus();
          }}
          disabled={isStreaming || !input.trim()}
        >
          {isStreaming ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Feather name="send" size={18} color={COLORS.background} />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  selectorContent: {
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
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  membersGrid: {
    gap: 12,
  },
  memberCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  memberIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  memberTitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
  },
  memberDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  selectBtnText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    padding: 6,
  },
  chatAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderName: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  chatHeaderTitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  emptyDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  chatList: {
    padding: 16,
    gap: 12,
  },
  userBubbleRow: {
    alignItems: "flex-end",
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: COLORS.primaryDim,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "80%",
  },
  userBubbleText: {
    color: COLORS.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  aiBubbleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  aiIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 4,
  },
  aiBubble: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flex: 1,
  },
  flagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  flagBadge: {
    backgroundColor: COLORS.primaryDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  flagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontFamily: "Inter_400Regular",
  },
  typingRow: {
    flexDirection: "row",
    gap: 5,
    padding: 14,
    paddingLeft: 46,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  inputBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
