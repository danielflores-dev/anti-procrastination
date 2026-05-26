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
  primary: '#7B72D6',
  secondary: '#B9B2EA',
  accent: '#A9A2DF',
  background: '#121119',
  surface: '#1B1A23',
  surfaceAlt: '#242230',
  text: '#FAF9FF',
  muted: '#B8B4C4',
  border: '#393548',
  tabBar: '#171620',
  tabInactive: '#AAA6B8',
  onPrimary: '#FAF9FF',
};

const SCHOOL_THEMES: Record<string, Omit<SchoolTheme, 'school'>> = {
  'University of California, Los Angeles': {
    name: 'UCLA',
    primary: '#3B79A6',
    secondary: '#C8A93D',
    accent: '#8AB7D6',
    background: '#101820',
    surface: '#17222C',
    surfaceAlt: '#202C37',
    text: '#F8FBFF',
    muted: '#B8C8D4',
    border: '#334858',
    tabBar: '#101D27',
    tabInactive: '#B8C8D4',
    onPrimary: '#F8FBFF',
  },
  'University of Southern California': {
    name: 'USC',
    primary: '#8A2020',
    secondary: '#C9A23B',
    accent: '#D8C277',
    background: '#1B1010',
    surface: '#271818',
    surfaceAlt: '#322121',
    text: '#FFF9EA',
    muted: '#D4C5C1',
    border: '#553633',
    tabBar: '#211313',
    tabInactive: '#D4C5C1',
    onPrimary: '#FFF9EA',
  },
  'Stanford University': {
    name: 'Stanford',
    primary: '#842525',
    secondary: '#D5C8BD',
    accent: '#D8A6A0',
    background: '#171111',
    surface: '#241818',
    surfaceAlt: '#312121',
    text: '#FFF8F4',
    muted: '#D2C3BE',
    border: '#563936',
    tabBar: '#1D1414',
    tabInactive: '#D2C3BE',
    onPrimary: '#FFF8F4',
  },
  'University of Washington': {
    name: 'Washington',
    primary: '#66508F',
    secondary: '#BBAE86',
    accent: '#CFC29A',
    background: '#15111F',
    surface: '#201B2B',
    surfaceAlt: '#2A2438',
    text: '#FBF8FF',
    muted: '#C8C0D6',
    border: '#4B435D',
    tabBar: '#191323',
    tabInactive: '#C8C0D6',
    onPrimary: '#FBF8FF',
  },
  'California State University, Long Beach': {
    name: 'CSULB',
    primary: '#2B2923',
    secondary: '#C9A33C',
    accent: '#D7C078',
    background: '#12110E',
    surface: '#1F1D18',
    surfaceAlt: '#29261F',
    text: '#FFFDF4',
    muted: '#CCC5B1',
    border: '#4F4936',
    tabBar: '#171510',
    tabInactive: '#DED7C1',
    onPrimary: '#FFFDF4',
  },
  'Arizona State University': {
    name: 'ASU',
    primary: '#8B2E4B',
    secondary: '#C9A33A',
    accent: '#D69AAE',
    background: '#1B1116',
    surface: '#2C1820',
    surfaceAlt: '#34202A',
    text: '#FFF8FB',
    muted: '#D4C0C8',
    border: '#563644',
    tabBar: '#21141A',
    tabInactive: '#E7CCD5',
    onPrimary: '#FFF8FB',
  },
  'University of Oregon': {
    name: 'Oregon',
    primary: '#2E674E',
    secondary: '#C8B43C',
    accent: '#8BCDB3',
    background: '#0F1713',
    surface: '#17251E',
    surfaceAlt: '#203026',
    text: '#F6FFF9',
    muted: '#B8CCBF',
    border: '#344D40',
    tabBar: '#111D17',
    tabInactive: '#C7E0D2',
    onPrimary: '#F6FFF9',
  },
  'New York University': {
    name: 'NYU',
    primary: '#704B92',
    secondary: '#B8A5D8',
    accent: '#C6B7E0',
    background: '#16101E',
    surface: '#251932',
    surfaceAlt: '#2D2439',
    text: '#FCF8FF',
    muted: '#CBBFD8',
    border: '#4B3D5A',
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
