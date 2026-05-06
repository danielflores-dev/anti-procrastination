# AntiProcrastination UI Primitives

Small themed components for repeated app patterns. They read the active school theme automatically, so screens do not need to rebuild button, card, chip, or field styles by hand.

## Components

- `ThemeButton`: primary, secondary, danger, and ghost actions. Use for CTAs, form actions, small room actions, and bottom-bar buttons.
- `ThemeCard`: bordered school-themed surfaces. Use for panels, assignment cards, room cards, and form groups.
- `ThemeChip`: selectable pills for filters, preferences, tags, and compact state.
- `ThemeField`: themed text input with built-in helper and error text.

## Example

```tsx
<ThemeCard>
  <ThemeField value={title} onChangeText={setTitle} placeholder="Assignment name" />
  <ThemeButton onPress={saveAssignment}>Save assignment</ThemeButton>
</ThemeCard>
```

Keep one-off layout styles local to the screen. Put shared touch targets, borders, typography weight, and theme-aware colors in these primitives.
