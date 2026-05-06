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
    accent: '#8AC7F2',
    background: '#0E1820',
    surface: '#162636',
    surfaceAlt: '#20384D',
    text: '#F8FBFF',
    muted: '#B9D2E5',
    border: '#365873',
    tabBar: '#101D27',
    tabInactive: '#B9D2E5',
    onPrimary: '#F8FBFF',
  },
  'University of Southern California': {
    name: 'USC',
    primary: '#990000',
    secondary: '#FFCC00',
    accent: '#FFE08A',
    background: '#1B1010',
    surface: '#2A1717',
    surfaceAlt: '#3A2020',
    text: '#FFF9EA',
    muted: '#E6CFCB',
    border: '#6B3A36',
    tabBar: '#211313',
    tabInactive: '#E6CFCB',
    onPrimary: '#FFF9EA',
  },
  'Stanford University': {
    name: 'Stanford',
    primary: '#8C1515',
    secondary: '#F3E8DF',
    accent: '#FFD8D8',
    background: '#171111',
    surface: '#261818',
    surfaceAlt: '#382020',
    text: '#FFF8F4',
    muted: '#E4CFC8',
    border: '#70433F',
    tabBar: '#1D1414',
    tabInactive: '#E4CFC8',
    onPrimary: '#FFF8F4',
  },
  'University of Washington': {
    name: 'Washington',
    primary: '#4B2E83',
    secondary: '#D8C89A',
    accent: '#EFE0B1',
    background: '#15111F',
    surface: '#211A31',
    surfaceAlt: '#302746',
    text: '#FBF8FF',
    muted: '#D7CCE8',
    border: '#5E5375',
    tabBar: '#191323',
    tabInactive: '#D7CCE8',
    onPrimary: '#FBF8FF',
  },
  'California State University, Long Beach': {
    name: 'CSULB',
    primary: '#2B2923',
    secondary: '#FFC72C',
    accent: '#FFE08A',
    background: '#12110E',
    surface: '#1F1D18',
    surfaceAlt: '#2E2A21',
    text: '#FFFDF4',
    muted: '#DED7C1',
    border: '#6D6241',
    tabBar: '#171510',
    tabInactive: '#DED7C1',
    onPrimary: '#FFFDF4',
  },
  'Arizona State University': {
    name: 'ASU',
    primary: '#8C1D40',
    secondary: '#FFC627',
    accent: '#FFC1D2',
    background: '#1B1116',
    surface: '#2C1820',
    surfaceAlt: '#3D202B',
    text: '#FFF8FB',
    muted: '#E7CCD5',
    border: '#704253',
    tabBar: '#21141A',
    tabInactive: '#E7CCD5',
    onPrimary: '#FFF8FB',
  },
  'University of Oregon': {
    name: 'Oregon',
    primary: '#154733',
    secondary: '#FEE123',
    accent: '#9BE8CD',
    background: '#0F1713',
    surface: '#17251E',
    surfaceAlt: '#20382C',
    text: '#F6FFF9',
    muted: '#C7E0D2',
    border: '#3F6853',
    tabBar: '#111D17',
    tabInactive: '#C7E0D2',
    onPrimary: '#F6FFF9',
  },
  'New York University': {
    name: 'NYU',
    primary: '#57068C',
    secondary: '#CDB7FF',
    accent: '#DCCBFF',
    background: '#16101E',
    surface: '#251932',
    surfaceAlt: '#352447',
    text: '#FCF8FF',
    muted: '#D9C8EB',
    border: '#624D79',
    tabBar: '#1B1324',
    tabInactive: '#D9C8EB',
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
