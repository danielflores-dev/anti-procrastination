---
name: AntiProcrastination
description: A social study app for college students who need a clearer next step.
colors:
  default-primary: "#6C63FF"
  default-secondary: "#0F0F0F"
  default-accent: "#B8B5FF"
  default-background: "#0F0F0F"
  default-surface: "#1A1A1A"
  default-surface-alt: "#252044"
  default-text: "#FFFFFF"
  default-muted: "#9CA3AF"
  default-border: "#2A2A2A"
  success: "#22C55E"
  warning: "#F59E0B"
  danger: "#EF4444"
  event: "#EC4899"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "normal"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "26px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "normal"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "normal"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0.6px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  hero: "24px"
  round: "999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.default-primary}"
    textColor: "{colors.default-text}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  button-secondary:
    backgroundColor: "{colors.default-surface-alt}"
    textColor: "{colors.default-text}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  card:
    backgroundColor: "{colors.default-surface}"
    textColor: "{colors.default-text}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input:
    backgroundColor: "{colors.default-surface-alt}"
    textColor: "{colors.default-text}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
  chip-selected:
    backgroundColor: "{colors.default-primary}"
    textColor: "{colors.default-text}"
    rounded: "{rounded.round}"
    padding: "8px 12px"
---

# Design System: AntiProcrastination

## 1. Overview

**Creative North Star: "Campus Game Night"**

AntiProcrastination should feel like a clean campus study hub with the warmth of a small group chat and the motivation loop of a light study game. The app is social, lively, and motivating, with a hint of Discord in the way students find people, rooms, and shared study activity.

The system is still a product interface first. It must stay clean and focused: every screen should make the next study action clear, keep social features lightweight, and avoid turning progress rewards into visual noise. School-based theming gives the app local identity after onboarding, while the default black and purple theme acts as the pre-school state.

It explicitly rejects corporate productivity software, childish gamification, crowded dashboards, and boring school portal patterns.

**Key Characteristics:**
- School-driven theme colors across the full app.
- Dark default canvas with high-contrast cards and clear touch targets.
- Rounded, lifted surfaces for active areas, study rooms, and focus controls.
- Motivational accents through coins, streaks, badges, and progress state.
- Social UI that feels useful before it feels busy.

## 2. Colors

The palette starts as a dark purple campus lobby, then swaps into the selected school's primary and secondary colors.

### Primary
- **Default Game Purple**: The pre-school accent for selected states, focus controls, active tabs, form focus, and empty-state action icons.
- **School Primary**: The selected university's main color. It carries heroes, tabs, avatars, room surfaces, and focus identity once a school is chosen.

### Secondary
- **Default Night Black**: The default secondary action color and core dark canvas.
- **School Spirit Accent**: The selected university's secondary color. It becomes the main call-to-action color for buttons, badges, active chips, and study-room actions.

### Tertiary
- **Success Green**: Completion, light workload, checked steps, and earned progress.
- **Warning Gold**: Moderate workload, coins, session recap highlights, and almost-done states.
- **Danger Red**: Heavy workload, urgent deadlines, delete actions, blocking, and leaving rooms.
- **Event Pink**: Special schedule events and shop theme tags.

### Neutral
- **Night Canvas**: App background before school selection.
- **Raised Surface**: Cards, panels, forms, lists, and room cards.
- **Purple Shadow Surface**: Secondary panels and selected inactive surfaces in the default theme.
- **Muted Student Text**: Secondary labels, helper copy, metadata, and less-important counts.
- **Quiet Border**: Separators and surface edges.

### Named Rules

**The School Takes Over Rule.** After a student selects a school, use the school theme for the entire app surface, not only badges or tiny accents.

**The Contrast First Rule.** Every school theme must keep text readable on primary, secondary, surface, and button colors. If a school color makes text hard to read, darken the surface or change the text token before shipping.

## 3. Typography

**Display Font:** System sans with platform-native fallbacks.
**Body Font:** System sans with platform-native fallbacks.
**Label/Mono Font:** System sans. No separate mono role is used.

**Character:** The typography is bold, compact, and app-native. It should read like a student tool: direct labels, strong titles, short helper text, and very little ceremony.

### Hierarchy
- **Display** (900, 32px, 1.1): Multiplayer hero titles and rare high-impact screen headings.
- **Headline** (800, 26px, 1.15): Main tab headings, dashboard greetings, schedule title, and single-player title.
- **Title** (800 to 900, 16px to 22px, 1.25): Cards, room names, profile names, modal titles, and party assignment names.
- **Body** (500 to 700, 13px to 15px, 1.4 to 1.5): Descriptions, metadata, helper text, comments, room details, and assignment details.
- **Label** (800 to 900, 11px to 12px, 0.5px to 1px letter spacing, uppercase when needed): Section labels, stats, tags, due-state labels, and recap kickers.

### Named Rules

**The Short Labels Rule.** Buttons and tabs must use short, obvious phrases. Use "Start focus", "Add class", "Find study groups", and "Save recap" style copy.

**The No Portal Copy Rule.** Avoid institutional wording. Say "Study room", not "resource reservation"; say "Find classmates", not "peer collaboration directory".

## 4. Elevation

The app uses lifted elevation for major actions and active states, with tonal layering for ordinary content. Cards sit on visible surfaces with borders; big buttons, tab bars, heroes, focus controls, and selected states can carry stronger shadow or glow.

### Shadow Vocabulary
- **Tab Bar Lift** (`shadowOffset: { width: 0, height: -4 }`, `shadowOpacity: 0.4`, `shadowRadius: 12`, `elevation: 16`): Bottom navigation only.
- **Hero Lift** (`shadowOffset: { width: 0, height: 10 }`, `shadowOpacity: 0.18`, `shadowRadius: 18`, `elevation: 8`): Multiplayer hero and other top-level feature panels.
- **Action Glow** (`shadowOpacity: 0.35`, `shadowRadius: 10`, `elevation: 6`): Primary actions that start a flow.
- **Focus Glow**: Animated rings and breathing glow on the focus timer. This is a signature state, not a general card treatment.

### Named Rules

**The Lift What Matters Rule.** Use strong elevation only for navigation, primary actions, active study states, and focus mode. Ordinary list cards stay bordered and tidy.

## 5. Components

### Buttons
- **Shape:** Rounded and tactile (12px to 16px radius).
- **Primary:** School secondary or default purple, heavy label weight, centered text, 14px to 16px vertical padding.
- **Secondary / Ghost:** Surface or surface-alt background with a one-pixel border.
- **Danger:** Red border or red fill only for destructive actions like delete, block, remove, leave room, or close room.

### Chips
- **Style:** Rounded pills for filters, tags, active assignment labels, and privacy states.
- **State:** Selected chips use the main action color. Unselected chips sit on surface-alt with a border.

### Cards / Containers
- **Corner Style:** Friendly rounded cards (14px to 22px), with larger radii for feature panels.
- **Background:** Surface for primary panels, surface-alt for inner rows and secondary content.
- **Shadow Strategy:** Lifted only for heroes, action buttons, and navigation; cards rely mostly on borders.
- **Border:** One-pixel border using the theme border token.
- **Internal Padding:** 12px to 16px for cards, 18px to 20px for major panels.

### Inputs / Fields
- **Style:** Surface-alt background, 12px to 14px radius, one-pixel border, high-contrast text.
- **Focus:** Shift border to the theme primary color.
- **Error / Disabled:** Error should use danger red with plain-language copy. Disabled controls should remain readable and not rely on opacity alone.

### Navigation
- **Style:** Bottom tabs on the theme tab-bar color, icons from FontAwesome5, 11px labels, active color from school secondary or default purple.
- **Active State:** Active tabs use strong color contrast. Badges use the school secondary color and compact bold labels.
- **Mobile Treatment:** Keep the tab bar stable at 70px height. Do not add extra tab copy or secondary labels.

### Signature Component

The focus session screen is the signature product moment. It uses a dark full-screen stage, animated rings, a large timer, coin feedback, party multiplier copy, and a recap panel. This screen can feel more immersive than the rest of the app, but it must still keep controls obvious.

## 6. Do's and Don'ts

### Do:
- **Do** make the next study action obvious on every screen.
- **Do** use school colors across the full app after school selection.
- **Do** keep social areas useful: profiles, friends, rooms, feed, and messages should support studying.
- **Do** use large touch targets for tabs, buttons, chips, room actions, and focus controls.
- **Do** keep contrast strong when school colors are bright or low contrast.
- **Do** reserve strong lift and glow for active states, primary actions, and focus mode.

### Don't:
- **Don't** make the app feel like corporate productivity software.
- **Don't** make the app feel too childish.
- **Don't** create crowded dashboards.
- **Don't** make it look like a boring school portal.
- **Don't** use social-feed density that competes with assignments and focus.
- **Don't** use color alone for progress, privacy, approval, friend request, or urgency state.
- **Don't** use border-left greater than 1px as a colored stripe on new card patterns. Use full borders, badges, icons, or workload pills instead.
