import { useSchoolTheme } from '@/context/SchoolThemeContext';
import { ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  type TouchableOpacityProps,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ThemeButtonProps = TouchableOpacityProps & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  textStyle?: StyleProp<TextStyle>;
};

export function ThemeButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  style,
  textStyle,
  activeOpacity = 0.85,
  ...props
}: ThemeButtonProps) {
  const { theme } = useSchoolTheme();
  const actionColor = theme.school ? theme.secondary : theme.primary;
  const actionText = theme.school ? theme.background : theme.onPrimary;

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? {
          backgroundColor: actionColor,
          borderColor: actionColor,
          shadowColor: actionColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.school ? 0.14 : 0.22,
          shadowRadius: theme.school ? 6 : 8,
          elevation: 4,
        }
      : variant === 'danger'
        ? { backgroundColor: 'transparent', borderColor: '#EF4444' }
        : variant === 'ghost'
          ? { backgroundColor: 'transparent', borderColor: 'transparent' }
          : { backgroundColor: theme.surfaceAlt, borderColor: theme.border };

  const color = variant === 'primary' ? actionText : variant === 'danger' ? '#EF4444' : theme.text;

  return (
    <TouchableOpacity
      activeOpacity={activeOpacity}
      style={[
        buttonStyles.base,
        buttonStyles[size],
        fullWidth && buttonStyles.fullWidth,
        variantStyle,
        style,
      ]}
      {...props}
    >
      {leftIcon}
      <Text style={[buttonStyles.text, { color }, size === 'sm' && buttonStyles.textSm, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

type ThemeCardProps = {
  children: ReactNode;
  variant?: 'surface' | 'alt' | 'elevated';
  style?: StyleProp<ViewStyle>;
};

export function ThemeCard({ children, variant = 'surface', style }: ThemeCardProps) {
  const { theme } = useSchoolTheme();
  const elevated = variant === 'elevated';

  return (
    <View
      style={[
        cardStyles.base,
        {
          backgroundColor: variant === 'alt' ? theme.surfaceAlt : theme.surface,
          borderColor: theme.border,
          shadowColor: elevated ? (theme.school ? theme.secondary : theme.primary) : 'transparent',
        },
        elevated && cardStyles.elevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ThemeChipProps = {
  children: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ThemeChip({ children, selected = false, onPress, style, textStyle }: ThemeChipProps) {
  const { theme } = useSchoolTheme();
  const actionColor = theme.school ? theme.secondary : theme.primary;
  const actionText = theme.school ? theme.background : theme.onPrimary;
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={onPress ? 0.85 : undefined}
      onPress={onPress}
      style={[
        chipStyles.base,
        {
          backgroundColor: selected ? actionColor : theme.surfaceAlt,
          borderColor: selected ? actionColor : theme.border,
        },
        style,
      ]}
    >
      <Text style={[chipStyles.text, { color: selected ? actionText : theme.text }, textStyle]}>{children}</Text>
    </Container>
  );
}

type ThemeFieldProps = TextInputProps & {
  error?: string;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
};

export function ThemeField({
  error,
  helper,
  containerStyle,
  inputStyle,
  style,
  placeholderTextColor,
  multiline,
  ...props
}: ThemeFieldProps) {
  const { theme } = useSchoolTheme();

  return (
    <View style={containerStyle}>
      <TextInput
        multiline={multiline}
        placeholderTextColor={placeholderTextColor ?? theme.muted}
        style={[
          fieldStyles.input,
          {
            backgroundColor: theme.surfaceAlt,
            borderColor: error ? '#EF4444' : theme.border,
            color: theme.text,
          },
          multiline && fieldStyles.multiline,
          inputStyle,
          style,
        ]}
        {...props}
      />
      {!!(error || helper) && (
        <Text style={[fieldStyles.meta, { color: error ? '#EF4444' : theme.muted }]}>
          {error ?? helper}
        </Text>
      )}
    </View>
  );
}

const buttonStyles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  sm: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 44 },
  md: { paddingHorizontal: 14, paddingVertical: 12 },
  lg: { paddingHorizontal: 18, paddingVertical: 15, borderRadius: 16 },
  fullWidth: { flex: 1 },
  text: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  textSm: { fontSize: 12 },
});

const cardStyles = StyleSheet.create({
  base: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  elevated: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
});

const chipStyles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 12, fontWeight: '700' },
});

const fieldStyles = StyleSheet.create({
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 74,
    textAlignVertical: 'top',
  },
  meta: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    marginTop: 5,
  },
});
