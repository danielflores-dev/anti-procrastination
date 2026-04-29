import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

export type SchoolTheme = {
  school: string | null;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  tabBar: string;
  tabInactive: string;
  onPrimary: string;
};

const DEFAULT_THEME: SchoolTheme = {
  school: null,
  name: 'Default',
  primary: '#6C63FF',
  secondary: '#0f0f0f',
  accent: '#B8B5FF',
  background: '#0f0f0f',
  surface: '#1a1a1a',
  surfaceAlt: '#252044',
  text: '#ffffff',
  muted: '#9CA3AF',
  border: '#2a2a2a',
  tabBar: '#141414',
  tabInactive: '#666',
  onPrimary: '#ffffff',
};

const SCHOOL_THEMES: Record<string, Omit<SchoolTheme, 'school'>> = {
  'University of California, Los Angeles': {
    name: 'UCLA',
    primary: '#2774AE',
    secondary: '#FFD100',
    accent: '#8BB8E8',
    background: '#F4F8FC',
    surface: '#FFFFFF',
    surfaceAlt: '#E7F1FA',
    text: '#102A43',
    muted: '#5B6B7A',
    border: '#C8DAEA',
    tabBar: '#FFFFFF',
    tabInactive: '#6B7B8C',
    onPrimary: '#FFFFFF',
  },
  'University of Southern California': {
    name: 'USC',
    primary: '#990000',
    secondary: '#FFCC00',
    accent: '#F6D365',
    background: '#FFF8E8',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF0C2',
    text: '#2B1600',
    muted: '#7A5C2E',
    border: '#E8D39A',
    tabBar: '#FFFFFF',
    tabInactive: '#7A5C2E',
    onPrimary: '#FFFFFF',
  },
  'Stanford University': {
    name: 'Stanford',
    primary: '#8C1515',
    secondary: '#4D4F53',
    accent: '#B83A4B',
    background: '#F8F4F1',
    surface: '#FFFFFF',
    surfaceAlt: '#F0E4DF',
    text: '#231F20',
    muted: '#6B5B57',
    border: '#DECBC3',
    tabBar: '#FFFFFF',
    tabInactive: '#756866',
    onPrimary: '#FFFFFF',
  },
  'University of Washington': {
    name: 'Washington',
    primary: '#4B2E83',
    secondary: '#B7A57A',
    accent: '#85754D',
    background: '#F7F4EC',
    surface: '#FFFFFF',
    surfaceAlt: '#EFE8D8',
    text: '#1E1633',
    muted: '#675A7A',
    border: '#D9CFB8',
    tabBar: '#FFFFFF',
    tabInactive: '#7A7189',
    onPrimary: '#FFFFFF',
  },
  'California State University, Long Beach': {
    name: 'CSULB',
    primary: '#000000',
    secondary: '#FFC72C',
    accent: '#F2B705',
    background: '#FFF9E8',
    surface: '#FFFFFF',
    surfaceAlt: '#FFF0B8',
    text: '#151515',
    muted: '#5F5A4D',
    border: '#EAD892',
    tabBar: '#FFFFFF',
    tabInactive: '#77705F',
    onPrimary: '#FFFFFF',
  },
  'Arizona State University': {
    name: 'ASU',
    primary: '#8C1D40',
    secondary: '#FFC627',
    accent: '#E74973',
    background: '#FFF7E3',
    surface: '#FFFFFF',
    surfaceAlt: '#FFE9A6',
    text: '#2D1320',
    muted: '#73515E',
    border: '#E8C878',
    tabBar: '#FFFFFF',
    tabInactive: '#7F6470',
    onPrimary: '#FFFFFF',
  },
  'University of Oregon': {
    name: 'Oregon',
    primary: '#154733',
    secondary: '#FEE123',
    accent: '#2C7A68',
    background: '#F2F7EC',
    surface: '#FFFFFF',
    surfaceAlt: '#E4F0D8',
    text: '#102A1F',
    muted: '#587064',
    border: '#CFE0C3',
    tabBar: '#FFFFFF',
    tabInactive: '#6F8178',
    onPrimary: '#FFFFFF',
  },
  'New York University': {
    name: 'NYU',
    primary: '#57068C',
    secondary: '#A78BFA',
    accent: '#8B5CF6',
    background: '#F6F0FA',
    surface: '#FFFFFF',
    surfaceAlt: '#EEE0F7',
    text: '#21102D',
    muted: '#6F5A7D',
    border: '#D8C1E8',
    tabBar: '#FFFFFF',
    tabInactive: '#7C6A88',
    onPrimary: '#FFFFFF',
  },
};

type SchoolThemeContextValue = {
  theme: SchoolTheme;
  setSchoolTheme: (school: string) => void;
};

const SchoolThemeContext = createContext<SchoolThemeContextValue | null>(null);

export function SchoolThemeProvider({ children }: { children: ReactNode }) {
  const [school, setSchool] = useState<string | null>(null);

  const theme = useMemo<SchoolTheme>(() => {
    if (!school) return DEFAULT_THEME;
    const schoolTheme = SCHOOL_THEMES[school] ?? DEFAULT_THEME;
    return { ...schoolTheme, school };
  }, [school]);

  return (
    <SchoolThemeContext.Provider value={{ theme, setSchoolTheme: setSchool }}>
      {children}
    </SchoolThemeContext.Provider>
  );
}

export function useSchoolTheme() {
  const value = useContext(SchoolThemeContext);
  if (!value) throw new Error('useSchoolTheme must be used inside SchoolThemeProvider');
  return value;
}
