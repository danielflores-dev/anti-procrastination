import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

const SCHOOL_KEY = 'antiprocrastination.school.v1';

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
  primary: '#8B95A7',
  secondary: '#B6BBC6',
  accent: '#A7AFBD',
  background: '#07090D',
  surface: '#101319',
  surfaceAlt: '#181C24',
  text: '#F2F4F7',
  muted: '#9BA3AF',
  border: '#2A303A',
  tabBar: '#0B0D12',
  tabInactive: '#7D8590',
  onPrimary: '#071018',
};

const SCHOOL_THEMES: Record<string, Omit<SchoolTheme, 'school'>> = {
  'University of California, Los Angeles': {
    name: 'UCLA',
    primary: '#3B79A6',
    secondary: '#C8A93D',
    accent: '#8AB7D6',
    background: '#111417',
    surface: '#191D21',
    surfaceAlt: '#20262B',
    text: '#F5F7F7',
    muted: '#A9B3B9',
    border: '#343E46',
    tabBar: '#15191D',
    tabInactive: '#A9B3B9',
    onPrimary: '#F8FBFF',
  },
  'University of Southern California': {
    name: 'USC',
    primary: '#8A2020',
    secondary: '#C9A23B',
    accent: '#D8C277',
    background: '#141211',
    surface: '#1E1A19',
    surfaceAlt: '#28211F',
    text: '#F8F3EA',
    muted: '#B8AAA3',
    border: '#403532',
    tabBar: '#181514',
    tabInactive: '#B8AAA3',
    onPrimary: '#FFF7EE',
  },
  'Stanford University': {
    name: 'Stanford',
    primary: '#842525',
    secondary: '#D5C8BD',
    accent: '#D8A6A0',
    background: '#141211',
    surface: '#1E1A19',
    surfaceAlt: '#28211F',
    text: '#F8F3EE',
    muted: '#B8AAA4',
    border: '#403532',
    tabBar: '#181514',
    tabInactive: '#B8AAA4',
    onPrimary: '#FFF8F4',
  },
  'University of Washington': {
    name: 'Washington',
    primary: '#66508F',
    secondary: '#BBAE86',
    accent: '#CFC29A',
    background: '#121216',
    surface: '#1B1B21',
    surfaceAlt: '#23232B',
    text: '#F6F3F8',
    muted: '#AEA8B8',
    border: '#383641',
    tabBar: '#16161B',
    tabInactive: '#AEA8B8',
    onPrimary: '#FBF8FF',
  },
  'California State University, Long Beach': {
    name: 'CSULB',
    primary: '#2B2923',
    secondary: '#C9A33C',
    accent: '#D7C078',
    background: '#121210',
    surface: '#1B1A17',
    surfaceAlt: '#24221E',
    text: '#F7F4EA',
    muted: '#B5B0A2',
    border: '#3A372E',
    tabBar: '#161511',
    tabInactive: '#B5B0A2',
    onPrimary: '#FFFDF4',
  },
  'Arizona State University': {
    name: 'ASU',
    primary: '#8B2E4B',
    secondary: '#C9A33A',
    accent: '#D69AAE',
    background: '#141214',
    surface: '#1E1A1D',
    surfaceAlt: '#282126',
    text: '#F8F3F5',
    muted: '#B8A9AF',
    border: '#40343A',
    tabBar: '#181518',
    tabInactive: '#B8A9AF',
    onPrimary: '#FFF8FB',
  },
  'University of Oregon': {
    name: 'Oregon',
    primary: '#2E674E',
    secondary: '#C8B43C',
    accent: '#8BCDB3',
    background: '#111411',
    surface: '#1A1E1A',
    surfaceAlt: '#222820',
    text: '#F2F7F1',
    muted: '#A9B7AA',
    border: '#333D34',
    tabBar: '#151814',
    tabInactive: '#A9B7AA',
    onPrimary: '#F6FFF9',
  },
  'New York University': {
    name: 'NYU',
    primary: '#704B92',
    secondary: '#B8A5D8',
    accent: '#C6B7E0',
    background: '#121216',
    surface: '#1B1B21',
    surfaceAlt: '#23232B',
    text: '#F6F3F8',
    muted: '#AEA8B8',
    border: '#383641',
    tabBar: '#16161B',
    tabInactive: '#AEA8B8',
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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SCHOOL_KEY);
        if (saved) setSchool(saved);
      } catch {
        // Fall back to the default theme.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (school) {
      AsyncStorage.setItem(SCHOOL_KEY, school).catch(() => {});
    } else {
      AsyncStorage.removeItem(SCHOOL_KEY).catch(() => {});
    }
  }, [school, hydrated]);

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
