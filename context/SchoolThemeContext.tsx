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
    background: '#123F63',
    surface: '#2774AE',
    surfaceAlt: '#1B5E8A',
    text: '#FFFFFF',
    muted: '#D7EAF7',
    border: '#8BB8E8',
    tabBar: '#123F63',
    tabInactive: '#D7EAF7',
    onPrimary: '#FFFFFF',
  },
  'University of Southern California': {
    name: 'USC',
    primary: '#990000',
    secondary: '#FFCC00',
    accent: '#F6D365',
    background: '#4A0000',
    surface: '#990000',
    surfaceAlt: '#740000',
    text: '#FFFFFF',
    muted: '#FFE7A3',
    border: '#FFCC00',
    tabBar: '#4A0000',
    tabInactive: '#FFE7A3',
    onPrimary: '#FFFFFF',
  },
  'Stanford University': {
    name: 'Stanford',
    primary: '#8C1515',
    secondary: '#4D4F53',
    accent: '#B83A4B',
    background: '#3D0A0A',
    surface: '#8C1515',
    surfaceAlt: '#6F1111',
    text: '#FFFFFF',
    muted: '#F0D6D6',
    border: '#B83A4B',
    tabBar: '#3D0A0A',
    tabInactive: '#F0D6D6',
    onPrimary: '#FFFFFF',
  },
  'University of Washington': {
    name: 'Washington',
    primary: '#4B2E83',
    secondary: '#B7A57A',
    accent: '#85754D',
    background: '#21103F',
    surface: '#4B2E83',
    surfaceAlt: '#3A2269',
    text: '#FFFFFF',
    muted: '#E7DDF7',
    border: '#B7A57A',
    tabBar: '#21103F',
    tabInactive: '#E7DDF7',
    onPrimary: '#FFFFFF',
  },
  'California State University, Long Beach': {
    name: 'CSULB',
    primary: '#000000',
    secondary: '#FFC72C',
    accent: '#F2B705',
    background: '#000000',
    surface: '#1C1C1C',
    surfaceAlt: '#2A2A2A',
    text: '#FFFFFF',
    muted: '#E8E0C8',
    border: '#FFC72C',
    tabBar: '#000000',
    tabInactive: '#E8E0C8',
    onPrimary: '#FFFFFF',
  },
  'Arizona State University': {
    name: 'ASU',
    primary: '#8C1D40',
    secondary: '#FFC627',
    accent: '#E74973',
    background: '#4B1023',
    surface: '#8C1D40',
    surfaceAlt: '#6D1631',
    text: '#FFFFFF',
    muted: '#FFDDE8',
    border: '#FFC627',
    tabBar: '#4B1023',
    tabInactive: '#FFDDE8',
    onPrimary: '#FFFFFF',
  },
  'University of Oregon': {
    name: 'Oregon',
    primary: '#154733',
    secondary: '#FEE123',
    accent: '#2C7A68',
    background: '#0B2B1E',
    surface: '#154733',
    surfaceAlt: '#103B2A',
    text: '#FFFFFF',
    muted: '#D8F3E5',
    border: '#FEE123',
    tabBar: '#0B2B1E',
    tabInactive: '#D8F3E5',
    onPrimary: '#FFFFFF',
  },
  'New York University': {
    name: 'NYU',
    primary: '#57068C',
    secondary: '#A78BFA',
    accent: '#8B5CF6',
    background: '#2D004D',
    surface: '#57068C',
    surfaceAlt: '#43056D',
    text: '#FFFFFF',
    muted: '#E9D5FF',
    border: '#A78BFA',
    tabBar: '#2D004D',
    tabInactive: '#E9D5FF',
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
