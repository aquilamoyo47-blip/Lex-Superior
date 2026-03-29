import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { COLORS } from "@/constants/colors";

interface MarkdownTextProps {
  content: string;
  style?: object;
}

interface TextSegment {
  text: string;
  bold?: boolean;
  code?: boolean;
}

function parseInline(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ text: text.slice(last, match.index) });
    }
    if (match[2]) {
      segments.push({ text: match[2], bold: true });
    } else if (match[3]) {
      segments.push({ text: match[3], code: true });
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    segments.push({ text: text.slice(last) });
  }

  return segments;
}

function InlineText({ segments }: { segments: TextSegment[] }) {
  return (
    <Text>
      {segments.map((seg, i) => (
        <Text
          key={i}
          style={[
            seg.bold && styles.bold,
            seg.code && styles.inlineCode,
          ]}
        >
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

export function MarkdownText({ content, style }: MarkdownTextProps) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      elements.push(
        <Text key={key++} style={styles.h1}>
          {line.slice(2)}
        </Text>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <Text key={key++} style={styles.h2}>
          {line.slice(3)}
        </Text>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <Text key={key++} style={styles.h3}>
          {line.slice(4)}
        </Text>
      );
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <View key={key++} style={styles.codeBlock}>
          <Text style={styles.codeText}>{codeLines.join("\n")}</Text>
        </View>
      );
    } else if (line.startsWith("---") || line.startsWith("___")) {
      elements.push(<View key={key++} style={styles.divider} />);
    } else if (line.match(/^[-*]\s/)) {
      const bulletText = line.slice(2);
      const segments = parseInline(bulletText);
      elements.push(
        <View key={key++} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.body, styles.bulletText]}>
            <InlineText segments={segments} />
          </Text>
        </View>
      );
    } else if (line.match(/^\d+\.\s/)) {
      const dotIdx = line.indexOf(". ");
      const num = line.slice(0, dotIdx);
      const itemText = line.slice(dotIdx + 2);
      const segments = parseInline(itemText);
      elements.push(
        <View key={key++} style={styles.bulletRow}>
          <Text style={styles.bullet}>{num}.</Text>
          <Text style={[styles.body, styles.bulletText]}>
            <InlineText segments={segments} />
          </Text>
        </View>
      );
    } else if (line.trim() === "") {
      elements.push(<View key={key++} style={styles.spacer} />);
    } else {
      const segments = parseInline(line);
      elements.push(
        <Text key={key++} style={[styles.body, style]}>
          <InlineText segments={segments} />
        </Text>
      );
    }

    i++;
  }

  return <View>{elements}</View>;
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
    fontFamily: "Inter_700Bold",
  },
  h2: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 10,
    marginBottom: 4,
    fontFamily: "Inter_600SemiBold",
  },
  h3: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 4,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  bold: {
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: "Inter_700Bold",
  },
  inlineCode: {
    fontFamily: "monospace",
    backgroundColor: COLORS.card,
    color: COLORS.primary,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontSize: 13,
  },
  codeBlock: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeText: {
    fontFamily: "monospace",
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  bulletRow: {
    flexDirection: "row",
    marginVertical: 2,
    paddingLeft: 4,
  },
  bullet: {
    color: COLORS.primary,
    marginRight: 8,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Inter_400Regular",
  },
  bulletText: {
    flex: 1,
  },
  spacer: {
    height: 6,
  },
});
