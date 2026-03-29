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
import { useGenerateDocument } from "@workspace/api-client-react";
import type { DocumentGenerationRequest } from "@workspace/api-client-react";

import { COLORS } from "@/constants/colors";
import { MarkdownText } from "@/components/MarkdownText";

const DOCUMENT_CATEGORIES = [
  {
    id: "pleadings",
    title: "Pleadings",
    subtitle: "Summons, Declaration, Plea, Replication",
    icon: "file-text" as const,
    color: COLORS.blue,
    colorDim: COLORS.blueDim,
    types: [
      { id: "summons", label: "Summons (Form 2)" },
      { id: "declaration", label: "Declaration" },
      { id: "plea", label: "Plea & Plea in Reconvention" },
      { id: "replication", label: "Replication" },
      { id: "special-plea", label: "Special Plea" },
    ],
  },
  {
    id: "applications",
    title: "Applications",
    subtitle: "Notice of Motion, Chamber Application, Urgent",
    icon: "clipboard" as const,
    color: COLORS.primary,
    colorDim: COLORS.primaryDim,
    types: [
      { id: "notice-of-motion", label: "Notice of Motion" },
      { id: "founding-affidavit", label: "Founding Affidavit" },
      { id: "chamber-application", label: "Chamber Application (Form 25)" },
      { id: "urgent-application", label: "Urgent Chamber Application" },
      { id: "certificate-of-urgency", label: "Certificate of Urgency" },
    ],
  },
  {
    id: "enforcement",
    title: "Enforcement",
    subtitle: "Writs, Garnishee Orders, Interpleader",
    icon: "shield" as const,
    color: COLORS.amber,
    colorDim: COLORS.amberDim,
    types: [
      { id: "writ-of-execution", label: "Writ of Execution (Form 38)" },
      { id: "emoluments-attachment", label: "Emoluments Attachment Order" },
      { id: "interpleader", label: "Interpleader Notice" },
    ],
  },
  {
    id: "appeals",
    title: "Appeals",
    subtitle: "Notice of Appeal, Heads of Argument",
    icon: "corner-right-up" as const,
    color: COLORS.purple,
    colorDim: COLORS.purpleDim,
    types: [
      { id: "notice-of-appeal", label: "Notice of Appeal" },
      { id: "heads-of-argument", label: "Heads of Argument" },
      { id: "cross-appeal", label: "Cross-Appeal Notice" },
    ],
  },
  {
    id: "general",
    title: "General",
    subtitle: "Affidavits, Acknowledgements, Consent Orders",
    icon: "edit-3" as const,
    color: COLORS.green,
    colorDim: COLORS.greenDim,
    types: [
      { id: "consent-order", label: "Consent Order / Draft Order" },
      { id: "acknowledgement-of-debt", label: "Acknowledgement of Debt" },
      { id: "statutory-declaration", label: "Statutory Declaration" },
      { id: "power-of-attorney", label: "Power of Attorney" },
    ],
  },
];

type ViewMode = "categories" | "types" | "form" | "result";

export default function DocumentsScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? 67 : insets.top;
  const bottomPad = isWeb ? 84 : insets.bottom;

  const [mode, setMode] = useState<ViewMode>("categories");
  const [selectedCategory, setSelectedCategory] = useState<typeof DOCUMENT_CATEGORIES[0] | null>(null);
  const [selectedType, setSelectedType] = useState<{ id: string; label: string } | null>(null);
  const [caseNumber, setCaseNumber] = useState("");
  const [applicant, setApplicant] = useState("");
  const [respondent, setRespondent] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);

  const { mutate: generateDocument, isPending } = useGenerateDocument({
    mutation: {
      onSuccess: (data) => {
        setGeneratedContent(data.content);
        setMode("result");
      },
      onError: () => {
        setGeneratedContent("Error generating document. Please try again.");
        setMode("result");
      },
    },
  });

  function handleGenerate() {
    if (!selectedType || !selectedCategory) return;

    const req: DocumentGenerationRequest = {
      documentType: selectedType.id,
      practiceArea: selectedCategory.id,
      caseDetails: {
        caseNumber: caseNumber.trim() || undefined,
        applicant: applicant.trim() || undefined,
        respondent: respondent.trim() || undefined,
      },
      additionalInfo: additionalInfo.trim() || undefined,
    };

    generateDocument({ data: req });
  }

  function goBack() {
    if (mode === "result") {
      setMode("form");
      setGeneratedContent(null);
    } else if (mode === "form") {
      setMode("types");
    } else if (mode === "types") {
      setMode("categories");
      setSelectedCategory(null);
    }
  }

  function reset() {
    setMode("categories");
    setSelectedCategory(null);
    setSelectedType(null);
    setCaseNumber("");
    setApplicant("");
    setRespondent("");
    setAdditionalInfo("");
    setGeneratedContent(null);
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
      {mode !== "categories" && (
        <Pressable onPress={goBack} style={styles.backRow}>
          <Feather name="arrow-left" size={16} color={COLORS.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      )}

      {mode === "categories" && (
        <>
          <Text style={styles.screenTitle}>Documents</Text>
          <Text style={styles.screenSubtitle}>
            Draft court-ready legal documents for Zimbabwe's Superior Courts
          </Text>
          <View style={styles.categoriesList}>
            {DOCUMENT_CATEGORIES.map((cat) => (
              <Pressable
                key={cat.id}
                style={({ pressed }) => [
                  styles.categoryCard,
                  { borderColor: cat.colorDim, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setMode("types");
                }}
              >
                <View style={[styles.catIcon, { backgroundColor: cat.colorDim }]}>
                  <Feather name={cat.icon} size={22} color={cat.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.catTitle}>{cat.title}</Text>
                  <Text style={styles.catSubtitle}>{cat.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {mode === "types" && selectedCategory && (
        <>
          <View style={[styles.catHeaderRow]}>
            <View style={[styles.catIcon, { backgroundColor: selectedCategory.colorDim }]}>
              <Feather name={selectedCategory.icon} size={20} color={selectedCategory.color} />
            </View>
            <Text style={[styles.screenTitle, { marginBottom: 0 }]}>{selectedCategory.title}</Text>
          </View>
          <Text style={styles.screenSubtitle}>Select document type to draft</Text>
          <View style={styles.typesList}>
            {selectedCategory.types.map((type) => (
              <Pressable
                key={type.id}
                style={({ pressed }) => [
                  styles.typeCard,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => {
                  setSelectedType(type);
                  setMode("form");
                }}
              >
                <View style={styles.typeDot} />
                <Text style={styles.typeLabel}>{type.label}</Text>
                <Feather name="chevron-right" size={16} color={COLORS.textMuted} />
              </Pressable>
            ))}
          </View>
        </>
      )}

      {mode === "form" && selectedType && (
        <>
          <Text style={styles.formDocType}>{selectedType.label}</Text>
          <Text style={styles.screenSubtitle}>
            Fill in the details below. Leave blank to use placeholders.
          </Text>

          <View style={styles.formFields}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Case Number</Text>
              <TextInput
                style={styles.fieldInput}
                value={caseNumber}
                onChangeText={setCaseNumber}
                placeholder="e.g. HC 1234/24"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Applicant / Plaintiff</Text>
              <TextInput
                style={styles.fieldInput}
                value={applicant}
                onChangeText={setApplicant}
                placeholder="Full name of applicant"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Respondent / Defendant</Text>
              <TextInput
                style={styles.fieldInput}
                value={respondent}
                onChangeText={setRespondent}
                placeholder="Full name of respondent"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Additional Details</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextarea]}
                value={additionalInfo}
                onChangeText={setAdditionalInfo}
                placeholder="Describe the facts, relief sought, or any specific instructions..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.generateBtn,
              { opacity: isPending || pressed ? 0.8 : 1 },
            ]}
            onPress={handleGenerate}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color={COLORS.background} />
            ) : (
              <>
                <Feather name="zap" size={18} color={COLORS.background} />
                <Text style={styles.generateBtnText}>Generate Document</Text>
              </>
            )}
          </Pressable>

          <Text style={styles.disclaimer}>
            This is AI-generated legal research assistance, not formal legal advice. Review with a
            registered legal practitioner before use.
          </Text>
        </>
      )}

      {mode === "result" && generatedContent && (
        <>
          <View style={styles.resultHeader}>
            <Feather name="check-circle" size={18} color={COLORS.success} />
            <Text style={styles.resultTitle}>{selectedType?.label}</Text>
          </View>

          <View style={styles.resultCard}>
            <MarkdownText content={generatedContent} />
          </View>

          <Pressable
            style={({ pressed }) => [styles.newDocBtn, { opacity: pressed ? 0.8 : 1 }]}
            onPress={reset}
          >
            <Feather name="plus" size={16} color={COLORS.primary} />
            <Text style={styles.newDocBtnText}>Draft Another Document</Text>
          </Pressable>
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
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  backText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: "Inter_400Regular",
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
    marginBottom: 20,
    lineHeight: 20,
  },
  categoriesList: {
    gap: 10,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  catIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  catTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  catSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  catHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  typesList: {
    gap: 8,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  typeLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    fontFamily: "Inter_400Regular",
  },
  formDocType: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  formFields: {
    gap: 14,
    marginBottom: 20,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  fieldInput: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  fieldTextarea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  generateBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.background,
    fontFamily: "Inter_700Bold",
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 16,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Inter_700Bold",
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  newDocBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primaryDim,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    borderRadius: 14,
    paddingVertical: 12,
  },
  newDocBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    fontFamily: "Inter_600SemiBold",
  },
});
