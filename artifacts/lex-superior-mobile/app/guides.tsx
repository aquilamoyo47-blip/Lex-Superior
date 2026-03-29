import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { COLORS } from "@/constants/colors";

interface GuideStep {
  title: string;
  description: string;
}

interface Guide {
  id: string;
  title: string;
  category: string;
  duration: string;
  icon: string;
  color: string;
  colorDim: string;
  overview: string;
  steps: GuideStep[];
  references: string[];
}

const GUIDES: Guide[] = [
  {
    id: "filing-summons",
    title: "Filing a Summons",
    category: "Civil Procedure",
    duration: "2–3 days",
    icon: "file-text",
    color: COLORS.blue,
    colorDim: COLORS.blueDim,
    overview:
      "A summons commences civil proceedings in the High Court of Zimbabwe. It must comply with Form 2 of the High Court Rules SI 202 of 2021.",
    steps: [
      {
        title: "Prepare the Summons",
        description:
          "Draft the summons in Form 2. It must include the full names of parties, the nature of the claim, the relief sought, and the return date. Mark variable fields such as [CASE NUMBER] and [RETURN DATE].",
      },
      {
        title: "File at the Registrar's Office",
        description:
          "Lodge the original plus two copies with the Registrar of the High Court. Pay the prescribed filing fee. The Registrar will stamp and allocate a case number.",
      },
      {
        title: "Effect Service",
        description:
          "Serve the summons on the defendant personally or at their chosen domicilium citandi et executandi. Service may also be effected via registered post or the Sheriff. Proof of service (return of service) must be filed.",
      },
      {
        title: "Await Appearance to Defend",
        description:
          "The defendant has ten (10) days from service to file an Appearance to Defend (Form 6). If no appearance is entered, you may apply for default judgment.",
      },
      {
        title: "Case Management",
        description:
          "Once appearance is entered, the matter proceeds to pleadings exchange (Declaration, Plea) and eventually trial management conference.",
      },
    ],
    references: [
      "High Court Rules SI 202 of 2021, Rule 8–12",
      "High Court Act Chapter 7:06",
      "Form 2 — High Court Rules",
    ],
  },
  {
    id: "urgent-chamber-application",
    title: "Urgent Chamber Application",
    category: "Applications",
    duration: "1 day",
    icon: "alert-triangle",
    color: COLORS.danger,
    colorDim: COLORS.dangerDim,
    overview:
      "Urgent chamber applications allow immediate relief before a Judge in Chambers without the normal notice periods. The Kuvarega v Registrar General test governs urgency.",
    steps: [
      {
        title: "Assess Urgency",
        description:
          "Apply the Kuvarega v Registrar General 1998 (1) ZLR 188 (H) test: the applicant must not have created the urgency, the matter must not be self-created, and irreparable harm must be imminent.",
      },
      {
        title: "Draft the Application",
        description:
          "Prepare a Chamber Application (Form 25), Founding Affidavit, and Certificate of Urgency. The certificate must be signed by the legal practitioner and contain specific averments on urgency.",
      },
      {
        title: "File and Request Duty Judge",
        description:
          "File with the Registrar and request an urgent hearing before the Duty Judge. The Registrar allocates the matter for immediate hearing or the next judicial sitting.",
      },
      {
        title: "Serve the Respondent",
        description:
          "Serve all papers on the respondent as soon as possible after filing. The Court may direct short service (e.g., 24 hours) depending on urgency.",
      },
      {
        title: "Attend the Hearing",
        description:
          "Appear before the Judge in Chambers. Be prepared to argue urgency and the merits of the interim relief. The court may grant a provisional or final order.",
      },
    ],
    references: [
      "High Court Rules SI 202 of 2021, Rule 244",
      "Kuvarega v Registrar General 1998 (1) ZLR 188 (H)",
      "Form 25 — Chamber Application",
    ],
  },
  {
    id: "appeals-process",
    title: "Appeals to the Supreme Court",
    category: "Appeals",
    duration: "30–60 days",
    icon: "corner-right-up",
    color: COLORS.purple,
    colorDim: COLORS.purpleDim,
    overview:
      "An appeal lies from the High Court to the Supreme Court of Zimbabwe on questions of law and fact unless restricted by statute.",
    steps: [
      {
        title: "Lodge Notice of Appeal",
        description:
          "File a Notice of Appeal within 15 days of the order appealed against (or longer with condonation). The notice must specify the grounds of appeal with sufficient particularity.",
      },
      {
        title: "Apply for Record",
        description:
          "File a Request for the Record of Proceedings from the Registrar. Ensure the transcript is prepared and certified.",
      },
      {
        title: "File Heads of Argument",
        description:
          "Appellant must file Heads of Argument within 15 days of receiving the record (or as directed). Heads must be concise with clear legal propositions and authorities.",
      },
      {
        title: "Respondent's Response",
        description:
          "Respondent files answering Heads of Argument within 10 days of receiving appellant's heads, or as directed by the Court.",
      },
      {
        title: "Hearing of Appeal",
        description:
          "The matter is set down for oral argument before a panel of Supreme Court judges. The appellant argues first, followed by the respondent.",
      },
    ],
    references: [
      "Supreme Court Act Chapter 7:13",
      "Supreme Court Rules SI 61 of 1964",
      "Constitution of Zimbabwe, Section 168–170",
    ],
  },
  {
    id: "writ-of-execution",
    title: "Enforcing a Judgment (Writ)",
    category: "Enforcement",
    duration: "7–14 days",
    icon: "shield",
    color: COLORS.amber,
    colorDim: COLORS.amberDim,
    overview:
      "Once a judgment is granted, execution is effected through a Writ of Execution against the judgment debtor's movable or immovable property.",
    steps: [
      {
        title: "Obtain a Certified Copy of Judgment",
        description:
          "Obtain a certified copy of the judgment from the Registrar to attach to the writ. Ensure the judgment has been served on the debtor.",
      },
      {
        title: "Prepare the Writ",
        description:
          "Complete Form 38 (Writ of Execution Against Movables) or Form 40 (Writ of Execution Against Immovables). Specify the judgment amount plus costs and interest.",
      },
      {
        title: "File with the Registrar / Sheriff",
        description:
          "File the writ with the Registrar who will stamp it and forward to the Sheriff of the High Court for execution.",
      },
      {
        title: "Sheriff's Execution",
        description:
          "The Sheriff will attach and sell the debtor's property at public auction. Proceeds are applied first to costs of execution, then the judgment debt.",
      },
      {
        title: "Return of Service",
        description:
          "After execution, the Sheriff files a Return of Service with the Registrar confirming what was attached and the outcome of the sale.",
      },
    ],
    references: [
      "High Court Rules SI 202 of 2021, Rules 348–380",
      "Form 38 — Writ of Execution Against Movables",
      "Form 40 — Writ of Execution Against Immovables",
    ],
  },
  {
    id: "constitutional-application",
    title: "Constitutional Application",
    category: "Constitutional Law",
    duration: "Variable",
    icon: "flag",
    color: COLORS.green,
    colorDim: COLORS.greenDim,
    overview:
      "Applications alleging violation of constitutional rights may be brought directly in the Constitutional Court or, in some cases, in the High Court with referral.",
    steps: [
      {
        title: "Identify the Constitutional Basis",
        description:
          "Identify the specific constitutional right(s) said to be infringed. Under Section 85 of the Constitution, any person may approach a competent court alleging infringement.",
      },
      {
        title: "Choose the Correct Forum",
        description:
          "Direct Access to the Constitutional Court is allowed only in exceptional circumstances under Rule 21. Otherwise, commence in the High Court and apply for referral.",
      },
      {
        title: "Draft the Application",
        description:
          "Prepare a founding affidavit clearly outlining: the right infringed, how it was infringed, the respondent's role, and the relief sought. Attach all supporting documentation.",
      },
      {
        title: "Serve on the State",
        description:
          "Serve the application on the Attorney-General's office where the State or a government body is a party. Service on the Registrar of the relevant court is also required.",
      },
      {
        title: "Relief and Costs",
        description:
          "The court may grant declaratory relief, damages, or structural interdicts. In constitutional matters, courts may decline costs against an unsuccessful party in appropriate cases.",
      },
    ],
    references: [
      "Constitution of Zimbabwe 2013, Section 85–86",
      "Constitutional Court Rules SI 61 of 2016",
      "Constitutional Court Act Chapter 7:21",
    ],
  },
];

export default function GuidesScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const bottomPad = isWeb ? 84 : insets.bottom;

  const [expandedId, setExpandedId] = useState<string | null>(null);

  function toggleGuide(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomPad + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.subtitle}>
        Step-by-step procedural guides for Zimbabwe's Superior Courts
      </Text>

      {GUIDES.map((guide) => {
        const isExpanded = expandedId === guide.id;

        return (
          <View key={guide.id} style={[styles.guideCard, { borderColor: guide.colorDim }]}>
            <Pressable
              style={styles.guideHeader}
              onPress={() => toggleGuide(guide.id)}
            >
              <View style={[styles.guideIcon, { backgroundColor: guide.colorDim }]}>
                <Feather name={guide.icon as any} size={20} color={guide.color} />
              </View>
              <View style={styles.guideMeta}>
                <Text style={[styles.guideCat, { color: guide.color }]}>
                  {guide.category}
                </Text>
                <Text style={styles.guideTitle}>{guide.title}</Text>
                <View style={styles.guideDurationRow}>
                  <Feather name="clock" size={11} color={COLORS.textMuted} />
                  <Text style={styles.guideDuration}>{guide.duration}</Text>
                </View>
              </View>
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={COLORS.textMuted}
              />
            </Pressable>

            {isExpanded && (
              <View style={styles.guideBody}>
                <View style={styles.divider} />
                <Text style={styles.guideOverview}>{guide.overview}</Text>

                <Text style={styles.stepsLabel}>Steps</Text>
                {guide.steps.map((step, i) => (
                  <View key={i} style={styles.stepItem}>
                    <View style={[styles.stepNum, { backgroundColor: guide.colorDim }]}>
                      <Text style={[styles.stepNumText, { color: guide.color }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={styles.stepTitle}>{step.title}</Text>
                      <Text style={styles.stepDesc}>{step.description}</Text>
                    </View>
                  </View>
                ))}

                <Text style={styles.refLabel}>References</Text>
                {guide.references.map((ref, i) => (
                  <View key={i} style={styles.refItem}>
                    <View style={styles.refDot} />
                    <Text style={styles.refText}>{ref}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.disclaimer}>
        <Feather name="shield" size={12} color={COLORS.textMuted} />
        <Text style={styles.disclaimerText}>
          These guides are for research and reference purposes only. Verify all procedural requirements with current Rules and consult a registered legal practitioner.
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
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    marginBottom: 20,
    lineHeight: 20,
  },
  guideCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
  },
  guideIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  guideMeta: {
    flex: 1,
    gap: 3,
  },
  guideCat: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Inter_700Bold",
  },
  guideDurationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  guideDuration: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
  },
  guideBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginBottom: 14,
  },
  guideOverview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 16,
  },
  stepsLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  stepItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  stepContent: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    fontFamily: "Inter_600SemiBold",
  },
  stepDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 4,
    marginBottom: 10,
  },
  refItem: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 6,
    alignItems: "flex-start",
  },
  refDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  refText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  disclaimer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  disclaimerText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 16,
  },
});
