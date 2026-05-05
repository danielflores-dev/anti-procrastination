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
  primary: '#5F52E8',
  secondary: '#D8D1FF',
  accent: '#B8B5FF',
  background: '#111018',
  surface: '#1B1924',
  surfaceAlt: '#28233D',
  text: '#FAF9FF',
  muted: '#B9B5C9',
  border: '#706A8E',
  tabBar: '#15131D',
  tabInactive: '#B2AEC4',
  onPrimary: '#FAF9FF',
};

const SCHOOL_THEMES: Record<string, Omit<SchoolTheme, 'school'>> = {
  'University of California, Los Angeles': {
    name: 'UCLA',
    primary: '#2774AE',
    secondary: '#FFD100',
    accent: '#C8E6FF',
    background: '#123F63',
    surface: '#1B5E8A',
    surfaceAlt: '#164D73',
    text: '#FAF9F1',
    muted: '#E3F3FF',
    border: '#FFD100',
    tabBar: '#123F63',
    tabInactive: '#E3F3FF',
    onPrimary: '#FAF9F1',
  },
  'University of Southern California': {
    name: 'USC',
    primary: '#990000',
    secondary: '#FFCC00',
    accent: '#FFE08A',
    background: '#4A0000',
    surface: '#990000',
    surfaceAlt: '#740000',
    text: '#FFF9EA',
    muted: '#FFE7A3',
    border: '#FFCC00',
    tabBar: '#4A0000',
    tabInactive: '#FFE7A3',
    onPrimary: '#FFF9EA',
  },
  'Stanford University': {
    name: 'Stanford',
    primary: '#8C1515',
    secondary: '#F3E8DF',
    accent: '#FFD8D8',
    background: '#3D0A0A',
    surface: '#8C1515',
    surfaceAlt: '#6F1111',
    text: '#FFF8F4',
    muted: '#F0D6D6',
    border: '#F3E8DF',
    tabBar: '#3D0A0A',
    tabInactive: '#F0D6D6',
    onPrimary: '#FFF8F4',
  },
  'University of Washington': {
    name: 'Washington',
    primary: '#4B2E83',
    secondary: '#D8C89A',
    accent: '#EFE0B1',
    background: '#21103F',
    surface: '#4B2E83',
    surfaceAlt: '#3A2269',
    text: '#FBF8FF',
    muted: '#E7DDF7',
    border: '#D8C89A',
    tabBar: '#21103F',
    tabInactive: '#E7DDF7',
    onPrimary: '#FBF8FF',
  },
  'California State University, Long Beach': {
    name: 'CSULB',
    primary: '#111111',
    secondary: '#FFC72C',
    accent: '#FFE08A',
    background: '#10100D',
    surface: '#1C1C1C',
    surfaceAlt: '#2A2A2A',
    text: '#FFFDF4',
    muted: '#E8E0C8',
    border: '#FFC72C',
    tabBar: '#10100D',
    tabInactive: '#E8E0C8',
    onPrimary: '#FFFDF4',
  },
  'Arizona State University': {
    name: 'ASU',
    primary: '#8C1D40',
    secondary: '#FFC627',
    accent: '#FFC1D2',
    background: '#4B1023',
    surface: '#8C1D40',
    surfaceAlt: '#6D1631',
    text: '#FFF8FB',
    muted: '#FFDDE8',
    border: '#FFC627',
    tabBar: '#4B1023',
    tabInactive: '#FFDDE8',
    onPrimary: '#FFF8FB',
  },
  'University of Oregon': {
    name: 'Oregon',
    primary: '#154733',
    secondary: '#FEE123',
    accent: '#9BE8CD',
    background: '#0B2B1E',
    surface: '#154733',
    surfaceAlt: '#103B2A',
    text: '#F6FFF9',
    muted: '#D8F3E5',
    border: '#FEE123',
    tabBar: '#0B2B1E',
    tabInactive: '#D8F3E5',
    onPrimary: '#F6FFF9',
  },
  'New York University': {
    name: 'NYU',
    primary: '#57068C',
    secondary: '#CDB7FF',
    accent: '#DCCBFF',
    background: '#2D004D',
    surface: '#57068C',
    surfaceAlt: '#43056D',
    text: '#FCF8FF',
    muted: '#E9D5FF',
    border: '#CDB7FF',
    tabBar: '#2D004D',
    tabInactive: '#E9D5FF',
    onPrimary: '#FCF8FF',
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
