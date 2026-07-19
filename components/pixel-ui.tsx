import { playClick, tapHaptic } from '@/components/sfx';
import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

/**
 * Pixel game UI kit.
 * The signature look: a dark 2px rim around every element, with an inner
 * bevel (light top/left edge, dark bottom/right edge) like classic 8-bit
 * game HUDs. Buttons invert the bevel and sink when pressed.
 */

// Real pixel typeface, loaded in the root layout. Every pixel-styled text in
// the app routes through this constant.
export const PIXEL_FONT = 'Silkscreen_700Bold';

export const GOLD = '#F59E0B';
export const DANGER = '#DC2626';

const RIM = 'rgba(0,0,0,0.5)';
const EDGE_LIGHT = 'rgba(255,255,255,0.14)';
const EDGE_DARK = 'rgba(0,0,0,0.32)';
const BTN_EDGE_LIGHT = 'rgba(255,255,255,0.3)';
const BTN_EDGE_DARK = 'rgba(0,0,0,0.3)';

// ---------------------------------------------------------------- PixelPanel

type PixelPanelProps = {
  children: ReactNode;
  tone?: 'surface' | 'alt';
  padding?: number;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
};

export function PixelPanel({ children, tone = 'surface', padding = 12, style, innerStyle }: PixelPanelProps) {
  const { theme } = useSchoolTheme();
  return (
    <View style={[styles.rim, style]}>
      <View
        style={[
          styles.bevelOut,
          {
            backgroundColor: tone === 'alt' ? theme.surfaceAlt : theme.surface,
            padding,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// --------------------------------------------------------------- PixelButton

type PixelButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  children: ReactNode;
  variant?: 'primary' | 'surface' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function PixelButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth,
  leftIcon,
  style,
  textStyle,
  disabled,
  onPressIn,
  ...props
}: PixelButtonProps) {
  const { theme } = useSchoolTheme();

  const handlePressIn: PixelButtonProps['onPressIn'] = event => {
    playClick();
    tapHaptic();
    onPressIn?.(event);
  };

  const face =
    variant === 'primary' ? theme.primary :
    variant === 'danger' ? DANGER :
    theme.surfaceAlt;
  const label =
    variant === 'primary' ? theme.onPrimary :
    variant === 'danger' ? '#FEE2E2' :
    theme.text;

  if (variant === 'ghost') {
    return (
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        onPressIn={handlePressIn}
        style={({ pressed }) => [
          styles.ghost,
          sizeStyles[size],
          fullWidth && styles.fullWidth,
          pressed && { opacity: 0.6 },
          disabled && { opacity: 0.4 },
          style,
        ]}
        {...props}
      >
        {leftIcon}
        <Text style={[styles.btnLabel, sizeText[size], { color: theme.muted }, textStyle]}>
          {children}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      onPressIn={handlePressIn}
      style={fullWidth ? styles.fullWidth : undefined}
      {...props}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.rim,
            pressed && styles.rimPressed,
            disabled && { opacity: 0.45 },
            style,
          ]}
        >
          <View
            style={[
              pressed ? styles.btnBevelIn : styles.btnBevelOut,
              sizeStyles[size],
              { backgroundColor: face },
            ]}
          >
            {leftIcon}
            <Text style={[styles.btnLabel, sizeText[size], { color: label }, textStyle]}>
              {children}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------- PixelBadge

type PixelBadgeProps = {
  children: ReactNode;
  onPress?: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  selected?: boolean;
};

export function PixelBadge({ children, onPress, icon, style, textStyle, accessibilityLabel, selected }: PixelBadgeProps) {
  const { theme } = useSchoolTheme();
  const body = (
    <View style={[styles.rim, style]}>
      <View
        style={[
          styles.bevelOut,
          styles.badgeFace,
          { backgroundColor: selected ? theme.primary : theme.surface },
        ]}
      >
        {icon}
        <Text style={[styles.badgeLabel, { color: selected ? theme.onPrimary : theme.text }, textStyle]}>
          {children}
        </Text>
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressed && { opacity: 0.75, transform: [{ translateY: 1 }] }}
    >
      {body}
    </Pressable>
  );
}

// ------------------------------------------------------------- PixelProgress

type PixelProgressProps = {
  /** 0..1 */
  progress: number;
  color?: string;
  blocks?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

export function PixelProgress({ progress, color, blocks = 12, height = 10, style }: PixelProgressProps) {
  const { theme } = useSchoolTheme();
  const filled = Math.round(Math.min(Math.max(progress, 0), 1) * blocks);
  return (
    <View style={[styles.progressRim, style]}>
      <View style={styles.progressRow}>
        {Array.from({ length: blocks }, (_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height,
              backgroundColor: i < filled ? (color ?? theme.primary) : 'rgba(255,255,255,0.07)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------------------- PixelConfirm

type PixelConfirmProps = {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get the red confirm button. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional preview content (e.g. a sprite) shown above the title. */
  children?: ReactNode;
};

/**
 * In-world replacement for Alert.alert confirms, which are a no-op on web.
 * Renders a beveled pixel card over a dimmed backdrop.
 */
export function PixelConfirm({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
  children,
}: PixelConfirmProps) {
  const { theme } = useSchoolTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmBackdrop}>
        <View style={styles.confirmRim}>
          <View style={[styles.confirmFace, { backgroundColor: theme.surface }]}>
            {children ? <View style={styles.confirmPreview}>{children}</View> : null}
            <Text style={[styles.confirmTitle, { color: theme.text }]}>{title}</Text>
            {!!message && <Text style={[styles.confirmMessage, { color: theme.muted }]}>{message}</Text>}
            <PixelButton
              size="lg"
              variant={danger ? 'danger' : 'primary'}
              onPress={onConfirm}
              accessibilityLabel={`${confirmLabel}: ${title}`}
            >
              {confirmLabel}
            </PixelButton>
            <PixelButton variant="ghost" onPress={onCancel}>
              {cancelLabel}
            </PixelButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// --------------------------------------------------------------- PixelField

type PixelFieldProps = TextInputProps & {
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Text input with a sunken bevel (inverted edges), like a retro form field. */
export function PixelField({ error, helper, containerStyle, style, placeholderTextColor, multiline, ...props }: PixelFieldProps) {
  const { theme } = useSchoolTheme();
  return (
    <View style={containerStyle}>
      <View style={[styles.rim, error ? { backgroundColor: DANGER } : null]}>
        <TextInput
          multiline={multiline}
          placeholderTextColor={placeholderTextColor ?? theme.muted}
          style={[
            styles.fieldInput,
            {
              backgroundColor: theme.surfaceAlt,
              color: theme.text,
            },
            multiline && styles.fieldMultiline,
            style,
          ]}
          {...props}
        />
      </View>
      {!!(error || helper) && (
        <Text style={[styles.fieldMeta, { color: error ? '#F87171' : theme.muted }]}>
          {error ?? helper}
        </Text>
      )}
    </View>
  );
}

// ------------------------------------------------------------- PixelHeading

type PixelHeadingProps = {
  children: ReactNode;
  hint?: string;
  style?: StyleProp<ViewStyle>;
};

export function PixelHeading({ children, hint, style }: PixelHeadingProps) {
  const { theme } = useSchoolTheme();
  return (
    <View style={style}>
      <View style={styles.headingRow}>
        <View style={[styles.headingSquare, { backgroundColor: theme.primary }]} />
        <Text style={[styles.headingText, { color: theme.text }]}>{children}</Text>
      </View>
      {!!hint && <Text style={[styles.headingHint, { color: theme.muted }]}>{hint}</Text>}
    </View>
  );
}

// -------------------------------------------------------------------- styles

const styles = StyleSheet.create({
  rim: {
    backgroundColor: RIM,
    padding: 2,
    borderRadius: 4,
  },
  rimPressed: {
    transform: [{ translateY: 2 }],
  },
  bevelOut: {
    borderRadius: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: EDGE_LIGHT,
    borderLeftColor: EDGE_LIGHT,
    borderBottomColor: EDGE_DARK,
    borderRightColor: EDGE_DARK,
  },
  btnBevelOut: {
    borderRadius: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: BTN_EDGE_LIGHT,
    borderLeftColor: BTN_EDGE_LIGHT,
    borderBottomColor: BTN_EDGE_DARK,
    borderRightColor: BTN_EDGE_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnBevelIn: {
    borderRadius: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: BTN_EDGE_DARK,
    borderLeftColor: BTN_EDGE_DARK,
    borderBottomColor: BTN_EDGE_LIGHT,
    borderRightColor: BTN_EDGE_LIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fullWidth: {
    flex: 1,
  },
  btnLabel: {
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  badgeFace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
  },
  progressRim: {
    backgroundColor: RIM,
    padding: 2,
    borderRadius: 3,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headingSquare: {
    width: 10,
    height: 10,
  },
  headingText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headingHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 18,
  },
  fieldInput: {
    borderRadius: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: EDGE_DARK,
    borderLeftColor: EDGE_DARK,
    borderBottomColor: EDGE_LIGHT,
    borderRightColor: EDGE_LIGHT,
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  fieldMultiline: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  fieldMeta: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    marginTop: 5,
  },
  confirmBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 32,
  },
  confirmRim: {
    backgroundColor: RIM,
    padding: 2,
    borderRadius: 4,
    width: '100%',
    maxWidth: 320,
  },
  confirmFace: {
    borderRadius: 2,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.16)',
    borderLeftColor: 'rgba(255,255,255,0.16)',
    borderBottomColor: 'rgba(0,0,0,0.4)',
    borderRightColor: 'rgba(0,0,0,0.4)',
    padding: 18,
    gap: 10,
  },
  confirmPreview: {
    alignItems: 'center',
    marginBottom: 2,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 4,
  },
});

const sizeStyles = StyleSheet.create({
  sm: { minHeight: 38, paddingHorizontal: 12, paddingVertical: 7 },
  md: { minHeight: 46, paddingHorizontal: 16, paddingVertical: 11 },
  lg: { minHeight: 54, paddingHorizontal: 20, paddingVertical: 14 },
});

const sizeText = StyleSheet.create({
  sm: { fontSize: 11 },
  md: { fontSize: 13 },
  lg: { fontSize: 14 },
});
