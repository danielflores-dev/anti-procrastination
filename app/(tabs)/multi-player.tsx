import AsyncStorage from '@react-native-async-storage/async-storage';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { PIXEL_FONT, PixelBadge, PixelButton, PixelField } from '@/components/pixel-ui';
import ArcadeTabScreen from '@/components/ArcadeTabScreen';
import PixelBackdrop from '@/components/PixelBackdrop';
import { useTasks } from '@/context/TaskContext';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  ScrollView,
  StyleSheet,
  type StyleProp,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';

type StudentProfile = {
  id: string;
  name: string;
  major: string;
  age: string;
  year: string;
  fact: string;
  focus: string;
  meeting: string;
  availability: string;
};

type PartyAssignment = {
  id: string;
  title: string;
  className: string;
  owner: string;
  goalHours: number;
  details: string;
  localTaskId?: string;
};

type StudyRoom = {
  id: string;
  name: string;
  floor: string;
  capacity: string;
  vibe: string;
  available: string;
  duration: string;
  subject: string;
  approvalRequired?: boolean;
  friendsOnly?: boolean;
  host?: string;
  memberIds: string[];
  pendingJoinIds: string[];
  assignments: PartyAssignment[];
};

type HelpPost = {
  id: string;
  author: string;
  major: string;
  kind: 'Help' | 'Suggestion';
  topic: string;
  details: string;
  time: string;
  comments: string[];
};

type ProfileField = 'name' | 'major' | 'age' | 'year' | 'coolFact' | 'studyGoal' | 'availability';
type RoomField = 'roomName' | 'roomSubject' | 'roomLocation' | 'roomTime' | 'roomDuration' | 'roomCapacity' | 'roomVibe';
type FieldErrors<T extends string> = Partial<Record<T, string>>;
type TextInputKeyboardType = ComponentProps<typeof TextInput>['keyboardType'];

function MotionNotice({
  message,
  accentColor,
  textColor,
}: {
  message: string | null;
  accentColor: string;
  textColor: string;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    if (reducedMotion) {
      translateY.setValue(0);
      opacity.setValue(1);
      return;
    }
    translateY.setValue(10);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [message, opacity, reducedMotion, translateY]);

  if (!message) return null;

  return (
    <Animated.View style={[noticeStyles.wrap, { backgroundColor: accentColor, opacity, transform: [{ translateY }] }]}>
      <FontAwesome5 name="check" size={12} color={textColor} />
      <Text style={[noticeStyles.text, { color: textColor }]}>{message}</Text>
    </Animated.View>
  );
}

const SCHOOL_OPTIONS = [
  'University of Washington',
  'University of California, Los Angeles',
  'University of Southern California',
  'California State University, Long Beach',
  'Stanford University',
  'Arizona State University',
  'University of Oregon',
  'New York University',
];

const SCHOOL_COLOR_SWATCHES: Record<string, [string, string]> = {
  'University of Washington': ['#66508F', '#BBAE86'],
  'University of California, Los Angeles': ['#3B79A6', '#C8A93D'],
  'University of Southern California': ['#8A2020', '#C9A23B'],
  'California State University, Long Beach': ['#2B2923', '#C9A33C'],
  'Stanford University': ['#842525', '#D5C8BD'],
  'Arizona State University': ['#8B2E4B', '#C9A33A'],
  'University of Oregon': ['#2E674E', '#C8B43C'],
  'New York University': ['#704B92', '#B8A5D8'],
};

const MEETING_OPTIONS = ['In person', 'Online', 'Either'];
const STUDY_OPTIONS = ['Homework', 'Exam prep', 'Projects', 'Accountability'];
const PROFILE_KEY = 'antiprocrastination.profile.v1';
const BROWSE_TABS = ['Library rooms', 'Profiles', 'Feed'] as const;
const FEED_KINDS: HelpPost['kind'][] = ['Help', 'Suggestion'];
const MIN_STUDENT_AGE = 13;
const MAX_STUDENT_AGE = 100;
const MAX_ROOM_CAPACITY = 20;
const BROWSE_TAB_META: Record<(typeof BROWSE_TABS)[number], { label: string; icon: ComponentProps<typeof FontAwesome5>['name'] }> = {
  'Library rooms': { label: 'Rooms', icon: 'door-open' },
  Profiles: { label: 'People', icon: 'user-friends' },
  Feed: { label: 'Feed', icon: 'comment-alt' },
};

const noticeStyles = StyleSheet.create({
  wrap: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 2,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 12,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});

const cleanText = (value: string, maxLength: number) => value.trim().replace(/\s+/g, ' ').slice(0, maxLength);
const isPlainNumber = (value: string) => /^\d+$/.test(value.trim());

const SAMPLE_PROFILES: StudentProfile[] = [
  {
    id: 'maya',
    name: 'Maya',
    major: 'Computer Science',
    age: '20',
    year: 'Sophomore',
    fact: 'I make tiny apps for my friends.',
    focus: 'Projects',
    meeting: 'In person',
    availability: 'Weekday afternoons',
  },
  {
    id: 'jordan',
    name: 'Jordan',
    major: 'Biology',
    age: '21',
    year: 'Junior',
    fact: 'I can explain cell diagrams with doodles.',
    focus: 'Exam prep',
    meeting: 'Either',
    availability: 'Evenings',
  },
  {
    id: 'sam',
    name: 'Sam',
    major: 'Business',
    age: '19',
    year: 'Freshman',
    fact: 'I am great at making study plans.',
    focus: 'Homework',
    meeting: 'Online',
    availability: 'Sunday mornings',
  },
];

const STARTING_ROOMS: StudyRoom[] = [
  {
    id: 'quiet-2a',
    name: 'Quiet Room 2A',
    floor: 'Second floor',
    capacity: '4 people',
    vibe: 'Quiet focus',
    available: 'Open today at 2 PM',
    duration: '1 hour',
    subject: 'General study',
    memberIds: ['maya', 'sam'],
    pendingJoinIds: [],
    assignments: [
      {
        id: 'quiet-2a-exam',
        title: 'Review for calculus exam',
        className: 'Math study group',
        owner: 'Maya',
        goalHours: 1,
        details: 'Practice problems, formulas, and any questions before the exam.',
      },
      {
        id: 'quiet-2a-notes',
        title: 'Clean up lecture notes',
        className: 'Shared notes',
        owner: 'Sam',
        goalHours: 0.5,
        details: 'Compare notes and fill in missing examples.',
      },
    ],
  },
  {
    id: 'group-1c',
    name: 'Group Room 1C',
    floor: 'First floor',
    capacity: '6 people',
    vibe: 'Whiteboard and discussion',
    available: 'Today at 3 PM',
    duration: '2 hours',
    subject: 'Exam prep',
    approvalRequired: true,
    memberIds: ['jordan'],
    pendingJoinIds: ['sam'],
    assignments: [
      {
        id: 'group-1c-exam',
        title: 'Study for biology exam',
        className: 'Biology 101',
        owner: 'Jordan',
        goalHours: 2,
        details: 'Go through study guide, flashcards, and lab review questions.',
      },
    ],
  },
  {
    id: 'media-3b',
    name: 'Media Room 3B',
    floor: 'Third floor',
    capacity: '5 people',
    vibe: 'Screens and project work',
    available: 'Tomorrow at 11 AM',
    duration: '90 minutes',
    subject: 'Projects',
    friendsOnly: true,
    memberIds: ['maya', 'jordan'],
    pendingJoinIds: [],
    assignments: [
      {
        id: 'media-3b-project',
        title: 'Finish project presentation',
        className: 'Project work',
        owner: 'Maya',
        goalHours: 1.5,
        details: 'Build slides, rehearse, and check sources together.',
      },
    ],
  },
];

const STARTING_POSTS: HelpPost[] = [
  {
    id: 'calc-midterm',
    author: 'Maya',
    major: 'Computer Science',
    kind: 'Help',
    topic: 'Calculus midterm review',
    details: 'I need help understanding limits and derivatives before Friday.',
    time: '20 min ago',
    comments: ['I can help with derivatives.', 'Want to meet after class?'],
  },
  {
    id: 'bio-lab',
    author: 'Jordan',
    major: 'Biology',
    kind: 'Help',
    topic: 'Bio lab report',
    details: 'Looking for someone to review my results section.',
    time: '1 hr ago',
    comments: ['I am working on the same lab.'],
  },
  {
    id: 'library-tip',
    author: 'Sam',
    major: 'Business',
    kind: 'Suggestion',
    topic: 'Quiet study spot',
    details: 'The third floor by the media rooms is usually empty after 5 PM.',
    time: '2 hrs ago',
    comments: ['That spot helped me finish my paper yesterday.'],
  },
];

export default function MultiPlayerScreen() {
  const router = useRouter();
  const { start, t } = useLocalSearchParams<{ start?: string; t?: string }>();
  const { theme, setSchoolTheme } = useSchoolTheme();
  const { tasks } = useTasks();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isSearching, setIsSearching] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [showSchoolSwitcher, setShowSchoolSwitcher] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [major, setMajor] = useState('');
  const [age, setAge] = useState('');
  const [year, setYear] = useState('');
  const [coolFact, setCoolFact] = useState('');
  const [studyGoal, setStudyGoal] = useState('');
  const [availability, setAvailability] = useState('');
  const [profileErrors, setProfileErrors] = useState<FieldErrors<ProfileField>>({});
  const [meetingPreference, setMeetingPreference] = useState('Either');
  const [studyFocus, setStudyFocus] = useState('Homework');
  const [showProfileExtras, setShowProfileExtras] = useState(false);
  const [activeBrowseTab, setActiveBrowseTab] = useState<(typeof BROWSE_TABS)[number]>('Library rooms');
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [pendingFriendIds, setPendingFriendIds] = useState<string[]>([]);
  const [incomingFriendIds, setIncomingFriendIds] = useState<string[]>(['jordan']);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [profileHidden, setProfileHidden] = useState(false);
  const [studyRooms, setStudyRooms] = useState<StudyRoom[]>(STARTING_ROOMS);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomSubject, setRoomSubject] = useState('');
  const [roomLocation, setRoomLocation] = useState('');
  const [roomTime, setRoomTime] = useState('');
  const [roomDuration, setRoomDuration] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [roomVibe, setRoomVibe] = useState('');
  const [roomErrors, setRoomErrors] = useState<FieldErrors<RoomField>>({});
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [activePartyRoom, setActivePartyRoom] = useState<StudyRoom | null>(null);
  const [partyTaskId, setPartyTaskId] = useState<string | null>(null);
  const [helpPosts, setHelpPosts] = useState<HelpPost[]>(STARTING_POSTS);
  const [postKind, setPostKind] = useState<HelpPost['kind']>('Help');
  const [helpTopic, setHelpTopic] = useState('');
  const [helpDetails, setHelpDetails] = useState('');
  const [showFeedComposer, setShowFeedComposer] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [motionNotice, setMotionNotice] = useState<string | null>(null);
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (!motionNotice) return;
    const timeout = setTimeout(() => setMotionNotice(null), 1800);
    return () => clearTimeout(timeout);
  }, [motionNotice]);

  // Restore a saved profile on startup.
  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY)
      .then(saved => {
        if (!saved) return;
        const p = JSON.parse(saved);
        setName(p.name ?? '');
        setMajor(p.major ?? '');
        setAge(p.age ?? '');
        setYear(p.year ?? '');
        setCoolFact(p.coolFact ?? '');
        setStudyGoal(p.studyGoal ?? '');
        setAvailability(p.availability ?? '');
        setMeetingPreference(p.meetingPreference ?? 'Either');
        setStudyFocus(p.studyFocus ?? 'Homework');
        setProfileImage(p.profileImage ?? null);
        if (p.school) setSelectedSchool(p.school);
        setProfileCreated(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (start !== 'school') return;
    if (profileCreated) {
      // Coming from the home school badge with a profile: open the switcher.
      setActiveBrowseTab('Profiles');
      setSchoolSearch('');
      setShowSchoolSwitcher(true);
    } else {
      setIsSearching(true);
    }
  }, [profileCreated, start, t]);

  const filteredSchools = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    if (!query) return SCHOOL_OPTIONS;
    return SCHOOL_OPTIONS.filter(school => school.toLowerCase().includes(query));
  }, [schoolSearch]);

  const filteredProfiles = useMemo(() => {
    return SAMPLE_PROFILES.filter(profile => !blockedIds.includes(profile.id));
  }, [blockedIds]);

  const activePartyMembers = useMemo(() => {
    if (!activePartyRoom) return [];
    const roomMembers = SAMPLE_PROFILES.filter(profile => activePartyRoom.memberIds.includes(profile.id));
    return [
      {
        id: 'you',
        name: name.trim() || 'You',
        major: major.trim() || 'Student',
        year: 'Party host',
        focus: 'Shared focus',
      },
      ...roomMembers,
    ];
  }, [activePartyRoom, major, name]);

  const partyMultiplier = 1 + Math.max(0, activePartyMembers.length - 1) * 0.5;
  const activePartyAssignments = useMemo(() => {
    if (!activePartyRoom) return [];
    const personalAssignments: PartyAssignment[] = tasks.map(task => ({
      id: `task-${task.id}`,
      title: task.assignmentName,
      className: task.className,
      owner: name.trim() || 'You',
      goalHours: task.hoursPerDay,
      details: task.description || `Due ${task.dueDate}`,
      localTaskId: task.id,
    }));

    return [...activePartyRoom.assignments, ...personalAssignments];
  }, [activePartyRoom, name, tasks]);
  const isHost = !!activePartyRoom?.host && activePartyRoom.host === name.trim();
  const pendingRoomProfiles = activePartyRoom
    ? SAMPLE_PROFILES.filter(profile => activePartyRoom.pendingJoinIds.includes(profile.id))
    : [];
  const selectedRoomMembers = selectedRoom
    ? SAMPLE_PROFILES.filter(profile => selectedRoom.memberIds.includes(profile.id))
    : [];
  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to add a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled) setProfileImage(result.assets[0].uri);
  };

  const handleSelectSchool = (school: string) => {
    setSelectedSchool(school);
    setSchoolSearch(school);
    setSchoolTheme(school);
    setShowProfileSetup(false);
    setShowSchoolSwitcher(false);
    if (profileCreated) setMotionNotice(`Switched to ${school}`);
  };

  // Pre-profile: clear the selection and go back to the school picker.
  const handleChangeSchool = () => {
    setSelectedSchool('');
    setSchoolSearch('');
    setShowProfileSetup(false);
    setIsSearching(true);
  };

  const clearProfileError = (field: ProfileField) => {
    setProfileErrors(current => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const clearRoomError = (field: RoomField) => {
    setRoomErrors(current => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSaveProfile = () => {
    const nextErrors: FieldErrors<ProfileField> = {};
    const nextName = cleanText(name, 40);
    const nextMajor = cleanText(major, 60);
    const nextAge = cleanText(age, 3);
    const nextYear = cleanText(year, 30);
    const nextFact = cleanText(coolFact, 140);
    const nextStudyGoal = cleanText(studyGoal, 80);
    const nextAvailability = cleanText(availability, 80);

    if (nextName.length < 2) nextErrors.name = 'Add at least 2 characters.';
    if (nextMajor.length < 2) nextErrors.major = 'Add your major or field.';
    if (nextAge && !isPlainNumber(nextAge)) {
      nextErrors.age = 'Use numbers only.';
    } else if (nextAge) {
      const parsedAge = Number(nextAge);
      if (parsedAge < MIN_STUDENT_AGE || parsedAge > MAX_STUDENT_AGE) {
        nextErrors.age = `Use an age from ${MIN_STUDENT_AGE} to ${MAX_STUDENT_AGE}.`;
      }
    }
    if (nextFact.length > 0 && nextFact.length < 8) nextErrors.coolFact = 'Add a little more detail or leave it blank.';
    if (nextStudyGoal.length > 0 && nextStudyGoal.length < 3) nextErrors.studyGoal = 'Add a clearer topic or leave it blank.';
    if (nextAvailability.length > 0 && nextAvailability.length < 3) nextErrors.availability = 'Add a clearer time or leave it blank.';

    setName(nextName);
    setMajor(nextMajor);
    setAge(nextAge);
    setYear(nextYear);
    setCoolFact(nextFact);
    setStudyGoal(nextStudyGoal);
    setAvailability(nextAvailability);
    setProfileErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    AsyncStorage.setItem(PROFILE_KEY, JSON.stringify({
      name: nextName,
      major: nextMajor,
      age: nextAge,
      year: nextYear,
      coolFact: nextFact,
      studyGoal: nextStudyGoal,
      availability: nextAvailability,
      meetingPreference,
      studyFocus,
      profileImage,
      school: selectedSchool || theme.name,
    })).catch(() => {});

    if (editingProfile) {
      setEditingProfile(false);
      setMotionNotice('Profile updated');
      return;
    }
    setProfileCreated(true);
  };

  const handleAddFriend = (profile: StudentProfile) => {
    if (friendIds.includes(profile.id) || pendingFriendIds.includes(profile.id)) return;
    setPendingFriendIds(current => [...current, profile.id]);
    setMotionNotice(`Friend request sent to ${profile.name}`);
  };

  const handleApproveFriend = (profileId: string) => {
    setIncomingFriendIds(current => current.filter(id => id !== profileId));
    setFriendIds(current => current.includes(profileId) ? current : [...current, profileId]);
  };

  const handleMessage = (profile: StudentProfile) => {
    Alert.alert('Message', `Message ${profile.name}.`);
  };

  const handleCreateRoom = () => {
    const nextErrors: FieldErrors<RoomField> = {};
    const nextRoomName = cleanText(roomName, 50);
    const nextSubject = cleanText(roomSubject, 70);
    const nextLocation = cleanText(roomLocation, 70);
    const nextTime = cleanText(roomTime, 60);
    const nextDuration = cleanText(roomDuration, 40);
    const nextCapacity = cleanText(roomCapacity, 2);
    const nextVibe = cleanText(roomVibe, 80);

    if (nextRoomName.length < 2) nextErrors.roomName = 'Add a room name.';
    if (nextSubject.length < 2) nextErrors.roomSubject = 'Add the class or topic.';
    if (nextLocation.length < 2) nextErrors.roomLocation = 'Add the library room or location.';
    if (nextTime.length < 3) nextErrors.roomTime = 'Add a clear meeting time.';
    if (nextDuration.length < 2) nextErrors.roomDuration = 'Add how long the room will meet.';
    if (nextCapacity) {
      if (!isPlainNumber(nextCapacity)) {
        nextErrors.roomCapacity = 'Use numbers only.';
      } else {
        const parsedCapacity = Number(nextCapacity);
        if (parsedCapacity < 1 || parsedCapacity > MAX_ROOM_CAPACITY) {
          nextErrors.roomCapacity = `Use 1 to ${MAX_ROOM_CAPACITY}.`;
        }
      }
    }
    if (nextVibe.length > 0 && nextVibe.length < 3) nextErrors.roomVibe = 'Add a clearer vibe or leave it blank.';

    setRoomName(nextRoomName);
    setRoomSubject(nextSubject);
    setRoomLocation(nextLocation);
    setRoomTime(nextTime);
    setRoomDuration(nextDuration);
    setRoomCapacity(nextCapacity);
    setRoomVibe(nextVibe);
    setRoomErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    const room: StudyRoom = {
      id: `room-${Date.now()}`,
      name: nextRoomName,
      floor: nextLocation,
      capacity: nextCapacity ? `${nextCapacity} people` : 'Open capacity',
      vibe: nextVibe || 'Study session',
      available: nextTime,
      duration: nextDuration,
      subject: nextSubject,
      approvalRequired,
      friendsOnly,
      host: name.trim(),
      memberIds: ['you'],
      pendingJoinIds: approvalRequired ? ['maya', 'jordan'] : [],
      assignments: [
        {
          id: `assignment-${Date.now()}`,
          title: nextSubject,
          className: major.trim() || 'Study group',
          owner: name.trim() || 'You',
          goalHours: 1,
          details: nextVibe || 'Use this room for the main topic.',
        },
      ],
    };

    setStudyRooms(current => [room, ...current]);
    setActivePartyRoom(room);
    setPartyTaskId(room.assignments[0]?.id ?? null);
    setActiveBrowseTab('Library rooms');
    setRoomName('');
    setRoomSubject('');
    setRoomLocation('');
    setRoomTime('');
    setRoomDuration('');
    setRoomCapacity('');
    setRoomVibe('');
    setApprovalRequired(true);
    setFriendsOnly(false);
    setRoomErrors({});
    setShowRoomForm(false);
    Alert.alert('Room created', 'You are hosting this room.');
  };

  const handleMessageRoom = (room: StudyRoom) => {
    Alert.alert('Message room', `Message ${room.name} before joining.`);
  };

  const handleConfirmJoin = (room: StudyRoom) => {
    setJoiningRoomId(room.id);
    if (room.approvalRequired) {
      setMotionNotice(`Request sent to ${room.name}`);
      setTimeout(() => {
        setStudyRooms(current => current.map(item => (
          item.id === room.id
            ? { ...item, pendingJoinIds: item.pendingJoinIds.includes('you') ? item.pendingJoinIds : [...item.pendingJoinIds, 'you'] }
            : item
        )));
        setSelectedRoom(null);
        setJoiningRoomId(null);
      }, 180);
      return;
    }

    setMotionNotice(`Joined ${room.name}`);
    setTimeout(() => {
      const joinedRoom = {
        ...room,
        memberIds: room.memberIds.includes('you') ? room.memberIds : ['you', ...room.memberIds],
      };
      setStudyRooms(current => current.map(item => item.id === room.id ? joinedRoom : item));
      setActivePartyRoom(joinedRoom);
      setPartyTaskId(joinedRoom.assignments[0]?.id ?? (tasks[0] ? `task-${tasks[0].id}` : null));
      setActiveBrowseTab('Library rooms');
      setSelectedRoom(null);
      setJoiningRoomId(null);
    }, 180);
  };

  const handleStartPartyFocus = () => {
    const selectedAssignment = activePartyAssignments.find(assignment => assignment.id === partyTaskId);
    if (!selectedAssignment) {
      Alert.alert('Choose work', 'Pick what the room is focusing on.');
      return;
    }

    router.push({
      pathname: '/focus',
      params: {
        id: selectedAssignment.localTaskId ?? selectedAssignment.id,
        partyRoom: activePartyRoom?.name ?? 'Study room',
        partySize: String(activePartyMembers.length),
        partyNames: activePartyMembers.map(member => member.name).join(', '),
        assignmentName: selectedAssignment.title,
        className: selectedAssignment.className,
        goalHours: String(selectedAssignment.goalHours),
      },
    });
  };

  const handleLeaveParty = () => {
    if (!activePartyRoom) return;
    setStudyRooms(current => current.map(room => (
      room.id === activePartyRoom.id
        ? { ...room, memberIds: room.memberIds.filter(memberId => memberId !== 'you') }
        : room
    )));
    setActivePartyRoom(null);
    setPartyTaskId(null);
    setActiveBrowseTab('Library rooms');
    setSelectedRoom(null);
    Alert.alert('Left study group', 'You left the room.');
  };

  const updateActivePartyRoom = (updater: (room: StudyRoom) => StudyRoom) => {
    if (!activePartyRoom) return;
    const updatedRoom = updater(activePartyRoom);
    setActivePartyRoom(updatedRoom);
    setStudyRooms(current => current.map(room => room.id === updatedRoom.id ? updatedRoom : room));
  };

  const handleApproveRoomRequest = (profileId: string) => {
    updateActivePartyRoom(room => ({
      ...room,
      pendingJoinIds: room.pendingJoinIds.filter(id => id !== profileId),
      memberIds: room.memberIds.includes(profileId) ? room.memberIds : [...room.memberIds, profileId],
    }));
  };

  const handleDenyRoomRequest = (profileId: string) => {
    updateActivePartyRoom(room => ({
      ...room,
      pendingJoinIds: room.pendingJoinIds.filter(id => id !== profileId),
    }));
  };

  const handleRemoveRoomMember = (profileId: string) => {
    updateActivePartyRoom(room => ({
      ...room,
      memberIds: room.memberIds.filter(id => id !== profileId),
    }));
  };

  const handleCloseRoom = () => {
    if (!activePartyRoom) return;
    setStudyRooms(current => current.filter(room => room.id !== activePartyRoom.id));
    setActivePartyRoom(null);
    setPartyTaskId(null);
    setActiveBrowseTab('Library rooms');
    setSelectedRoom(null);
    Alert.alert('Room closed', 'This room is no longer listed.');
  };

  const handleCreateHelpPost = () => {
    if (!helpTopic.trim() || !helpDetails.trim()) {
      Alert.alert('Add a topic', 'Add a topic and a note.');
      return;
    }

    setHelpPosts(current => [{
      id: `post-${Date.now()}`,
      author: name.trim() || 'You',
      major: major.trim() || 'Student',
      kind: postKind,
      topic: helpTopic.trim(),
      details: helpDetails.trim(),
      time: 'Just now',
      comments: [],
    }, ...current]);
    setHelpTopic('');
    setHelpDetails('');
    setShowFeedComposer(false);
  };

  const handleAddComment = (postId: string) => {
    const comment = commentDrafts[postId]?.trim();
    if (!comment) return;
    setHelpPosts(current => current.map(post => (
      post.id === postId ? { ...post, comments: [...post.comments, comment] } : post
    )));
    setCommentDrafts(current => ({ ...current, [postId]: '' }));
  };

  const renderField = ({
    value,
    onChangeText,
    placeholder,
    error,
    maxLength,
    multiline,
    keyboardType,
    containerStyle,
    showHelper = true,
  }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
    error?: string;
    maxLength: number;
    multiline?: boolean;
    keyboardType?: TextInputKeyboardType;
    containerStyle?: StyleProp<ViewStyle>;
    showHelper?: boolean;
  }) => (
    <PixelField
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      error={error}
      helper={showHelper ? `${maxLength - value.length} left` : undefined}
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={maxLength}
      accessibilityLabel={placeholder}
      accessibilityHint={error ?? `${maxLength} characters maximum`}
      containerStyle={[styles.fieldWrap, containerStyle]}
    />
  );

  const renderEmptyPanel = ({
    icon,
    title,
    body,
    steps,
    action,
  }: {
    icon: ComponentProps<typeof FontAwesome5>['name'];
    title: string;
    body: string;
    steps?: string[];
    action?: ReactNode;
  }) => (
    <View style={[styles.emptyPanel, styles.emptyPanelFeatured]}>
      <View style={styles.emptyIconBubble}>
        <FontAwesome5 name={icon} size={18} color={theme.primary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{body}</Text>
      {!!steps?.length && (
        <View style={styles.emptyStepList}>
          {steps.map((step, index) => (
            <View key={step} style={styles.emptyStep}>
              <Text style={styles.emptyStepNumber}>{index + 1}</Text>
              <Text style={styles.emptyStepText}>{step}</Text>
            </View>
          ))}
        </View>
      )}
      {action}
    </View>
  );

  const renderProfileSetup = () => (
    <View style={styles.profileSection}>
      <View style={styles.profileSetupPanel}>
        <View style={styles.profileMiniSchool}>
          <View style={styles.schoolSwatches}>
            {(SCHOOL_COLOR_SWATCHES[selectedSchool] ?? [theme.primary, theme.secondary]).map(color => (
              <View key={color} style={[styles.schoolSwatch, { backgroundColor: color }]} />
            ))}
          </View>
          <View style={styles.profileHeadingText}>
            <Text style={styles.selectedSchoolLabel}>School</Text>
            <Text style={styles.selectedSchoolText}>{selectedSchool}</Text>
          </View>
          {!editingProfile && (
            <TouchableOpacity
              style={styles.changeSchoolButton}
              onPress={handleChangeSchool}
              activeOpacity={0.8}
              accessibilityLabel="Change your school"
              accessibilityRole="button"
            >
              <Text style={styles.changeSchoolText}>Change</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.profileComposerHeader}>
          <TouchableOpacity style={styles.profileAvatarButton} onPress={pickProfileImage} activeOpacity={0.85} accessibilityLabel="Add profile photo" accessibilityRole="button">
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileAvatarImage} />
            ) : (
              <View style={styles.profileAvatarEmpty}>
                <Text style={styles.profileAvatarInitial}>{(name.trim() || 'Y').slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.profilePhotoBadge}>
              <FontAwesome5 name="camera" size={10} color={theme.onPrimary} />
            </View>
          </TouchableOpacity>

          <View style={styles.profileIntroCopy}>
            <Text style={styles.profileTitle}>{editingProfile ? 'Edit your profile' : 'Create your profile'}</Text>
            <Text style={[styles.profileSub, styles.profileIntroSub]}>Help classmates know who they are studying with.</Text>
          </View>
        </View>

        <View style={styles.profileFormBlock}>
          {renderField({
            value: name,
            onChangeText: text => {
              setName(text);
              clearProfileError('name');
            },
            placeholder: 'Name',
            error: profileErrors.name,
            maxLength: 40,
            showHelper: false,
          })}
          {renderField({
            value: major,
            onChangeText: text => {
              setMajor(text);
              clearProfileError('major');
            },
            placeholder: 'Major or field',
            error: profileErrors.major,
            maxLength: 60,
            showHelper: false,
          })}
        </View>

        <View style={styles.profilePreviewLine}>
          <Text style={styles.previewName}>{name.trim() || 'Your name'}</Text>
          <Text style={styles.previewMeta}>{major.trim() || 'Your major'} at {selectedSchool}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>How do you want to meet?</Text>
      <View style={styles.choiceRow}>
        {MEETING_OPTIONS.map(option => (
          <PixelBadge key={option} selected={meetingPreference === option} onPress={() => setMeetingPreference(option)}>
            {option}
          </PixelBadge>
        ))}
      </View>

      <Text style={styles.sectionLabel}>What are you usually working on?</Text>
      <View style={styles.choiceRow}>
        {STUDY_OPTIONS.map(option => (
          <PixelBadge key={option} selected={studyFocus === option} onPress={() => setStudyFocus(option)}>
            {option}
          </PixelBadge>
        ))}
      </View>

      <TouchableOpacity style={styles.profileExtrasToggle} onPress={() => setShowProfileExtras(current => !current)} activeOpacity={0.85} accessibilityLabel={showProfileExtras ? 'Hide optional details' : 'Add optional details'} accessibilityRole="button">
        <Text style={styles.profileExtrasText}>{showProfileExtras ? 'Hide optional details' : 'Add optional details'}</Text>
        <FontAwesome5 name={showProfileExtras ? 'chevron-up' : 'chevron-down'} size={12} color={theme.text} />
      </TouchableOpacity>

      {showProfileExtras && (
        <View style={styles.profileExtras}>
          <View style={styles.twoColumn}>
            {renderField({
              value: age,
              onChangeText: text => {
                setAge(text.replace(/[^\d]/g, ''));
                clearProfileError('age');
              },
              placeholder: 'Age',
              error: profileErrors.age,
              maxLength: 3,
              keyboardType: 'number-pad',
              containerStyle: styles.halfInput,
              showHelper: false,
            })}
            {renderField({
              value: year,
              onChangeText: text => {
                setYear(text);
                clearProfileError('year');
              },
              placeholder: 'Year',
              error: profileErrors.year,
              maxLength: 30,
              containerStyle: styles.halfInput,
              showHelper: false,
            })}
          </View>
          {renderField({
            value: availability,
            onChangeText: text => {
              setAvailability(text);
              clearProfileError('availability');
            },
            placeholder: 'When are you free?',
            error: profileErrors.availability,
            maxLength: 80,
            showHelper: false,
          })}
          {renderField({
            value: studyGoal,
            onChangeText: text => {
              setStudyGoal(text);
              clearProfileError('studyGoal');
            },
            placeholder: 'What are you working on?',
            error: profileErrors.studyGoal,
            maxLength: 80,
            showHelper: false,
          })}
          {renderField({
            value: coolFact,
            onChangeText: text => {
              setCoolFact(text);
              clearProfileError('coolFact');
            },
            placeholder: 'Fun fact about you',
            error: profileErrors.coolFact,
            maxLength: 140,
            multiline: true,
            showHelper: false,
          })}
        </View>
      )}

      <PixelButton size="lg" style={styles.compactActionButton} onPress={handleSaveProfile}>
        {editingProfile ? 'Save changes' : 'Create profile'}
      </PixelButton>
      {editingProfile && (
        <PixelButton variant="ghost" onPress={() => { setEditingProfile(false); setProfileErrors({}); }}>
          Cancel
        </PixelButton>
      )}
    </View>
  );

  const renderSchoolConfirmation = () => (
    <View style={styles.profileSection}>
      <View style={styles.schoolConfirm}>
        <View style={styles.selectedSchoolTop}>
          <View style={styles.schoolConfirmCopy}>
            <Text style={styles.selectedSchoolLabel}>School set</Text>
            <Text style={styles.schoolConfirmTitle}>{theme.name}</Text>
            <Text style={styles.schoolConfirmText}>Your app now uses your campus colors. Start by adding one assignment.</Text>
          </View>
          <View style={styles.schoolSwatches}>
            {(SCHOOL_COLOR_SWATCHES[selectedSchool] ?? [theme.primary, theme.secondary]).map(color => (
              <View key={color} style={[styles.schoolSwatch, { backgroundColor: color }]} />
            ))}
          </View>
        </View>
        <TouchableOpacity
          style={styles.changeSchoolButton}
          onPress={handleChangeSchool}
          activeOpacity={0.8}
          accessibilityLabel="Change your school"
          accessibilityRole="button"
        >
          <Text style={styles.changeSchoolText}>Not your school? Change it</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.onboardingNext}>
        <Text style={styles.sectionLabel}>Next</Text>
        <Text style={styles.profileTitle}>Add your first assignment</Text>
        <Text style={styles.profileSub}>Use a photo or enter it yourself. You can make a profile after that.</Text>
        <PixelButton size="lg" style={styles.compactActionButton} onPress={() => router.push('/auto-add')}>
          Add assignment
        </PixelButton>
        <PixelButton variant="surface" onPress={() => setShowProfileSetup(true)}>
          Set up profile instead
        </PixelButton>
      </View>
    </View>
  );

  const renderProfiles = () => {
    const incomingRequests = filteredProfiles.filter(profile => incomingFriendIds.includes(profile.id));

    return (
      <View style={styles.cardList}>
        {incomingRequests.length > 0 && (
          <View style={styles.requestPanel}>
            <Text style={styles.listLabel}>Friend requests</Text>
            {incomingRequests.map(profile => (
              <View key={profile.id} style={styles.personRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.personCopy}>
                  <Text style={styles.cardName}>{profile.name}</Text>
                  <Text style={styles.cardSubtle}>{profile.major}</Text>
                </View>
                <TouchableOpacity style={styles.smallButton} onPress={() => handleApproveFriend(profile.id)} accessibilityLabel={`Approve ${profile.name}`} accessibilityRole="button">
                  <Text style={styles.smallButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.listLabel}>People — {filteredProfiles.length}</Text>
        {filteredProfiles.map(profile => {
          const isFriend = friendIds.includes(profile.id);
          const isPending = pendingFriendIds.includes(profile.id);
          return (
            <View key={profile.id} style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
              </View>
              <View style={styles.personCopy}>
                <View style={styles.personNameRow}>
                  <Text style={styles.cardName}>{profile.name}</Text>
                  {isFriend && <FontAwesome5 name="check-circle" size={11} color={theme.primary} />}
                </View>
                <Text style={styles.cardSubtle} numberOfLines={1}>
                  {profile.major} · {profile.focus} · {profile.meeting}
                </Text>
              </View>
              <TouchableOpacity style={styles.iconButton} onPress={() => handleMessage(profile)} accessibilityLabel={`Message ${profile.name}`} accessibilityRole="button">
                <FontAwesome5 name="comment" size={13} color={theme.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconButton, (isFriend || isPending) && styles.iconButtonActive]}
                onPress={() => handleAddFriend(profile)}
                disabled={isFriend || isPending}
                accessibilityLabel={isFriend ? `${profile.name} is your friend` : isPending ? `Waiting for ${profile.name} to approve` : `Add ${profile.name} as a friend`}
                accessibilityRole="button"
              >
                {isPending ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <FontAwesome5
                    name={isFriend ? 'check' : 'user-plus'}
                    size={13}
                    color={isFriend ? theme.primary : theme.text}
                  />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderFeed = () => (
    <View style={styles.cardList}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Campus feed</Text>
          <Text style={styles.sectionHint}>Ask for help or share a study tip.</Text>
        </View>
        <Text style={styles.countPill}>{helpPosts.length}</Text>
      </View>
      <PixelButton style={styles.compactActionButton} onPress={() => setShowFeedComposer(current => !current)}>
        {showFeedComposer ? 'Cancel post' : 'Write post'}
      </PixelButton>
      {showFeedComposer && (
        <View style={styles.roomForm}>
          <Text style={styles.profileTitle}>Share a post</Text>
          <View style={styles.choiceRow}>
            {FEED_KINDS.map(kind => (
              <PixelBadge key={kind} selected={postKind === kind} onPress={() => setPostKind(kind)}>
                {kind}
              </PixelBadge>
            ))}
          </View>
          <PixelField value={helpTopic} onChangeText={setHelpTopic} placeholder="What do you need help with?" containerStyle={styles.fieldWrap} />
          <PixelField value={helpDetails} onChangeText={setHelpDetails} placeholder="Add details or a suggestion" multiline containerStyle={styles.fieldWrap} />
          <PixelButton onPress={handleCreateHelpPost}>Share post</PixelButton>
        </View>
      )}

      {helpPosts.map(post => (
        <View key={post.id} style={styles.feedCard}>
          <View style={styles.cardHeader}>
            <View style={styles.profileHeadingText}>
              <Text style={styles.feedKind}>{post.kind}</Text>
              <Text style={styles.cardName}>{post.topic}</Text>
              <Text style={styles.cardMajor}>{post.author} - {post.major}</Text>
          </View>
          <Text style={styles.cardMeta}>{post.time}</Text>
        </View>
          <Text style={styles.cardFact}>{post.details}</Text>
          {post.comments.length > 0 && (
            <View style={styles.commentList}>
              {post.comments.map((comment, index) => (
                <Text key={`${post.id}-${index}`} style={styles.commentText}>{comment}</Text>
              ))}
            </View>
          )}
          <View style={styles.commentRow}>
            <TextInput
              value={commentDrafts[post.id] ?? ''}
              onChangeText={text => setCommentDrafts(current => ({ ...current, [post.id]: text }))}
              placeholder="Comment or offer help"
              placeholderTextColor={theme.muted}
              style={[styles.input, styles.commentInput]}
            />
            <TouchableOpacity style={styles.smallButton} onPress={() => handleAddComment(post.id)} accessibilityLabel={`Send comment on ${post.topic}`}>
              <Text style={styles.smallButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
      {helpPosts.length === 0 && renderEmptyPanel({
        icon: 'comments',
        title: 'No posts yet',
        body: 'No posts yet.',
        steps: ['Ask about one class', 'Share a useful study tip'],
        action: (
          <PixelButton variant="surface" onPress={() => setShowFeedComposer(true)}>
            Write first post
          </PixelButton>
        ),
      })}
    </View>
  );

  const renderActiveParty = () => {
    if (!activePartyRoom) return null;

    return (
      <View style={styles.partyCard}>
        <View style={styles.partyHeader}>
          <View style={styles.profileHeadingText}>
            <Text style={styles.selectedSchoolLabel}>Current room</Text>
            <Text style={styles.partyTitle}>{activePartyRoom.name}</Text>
            <Text style={styles.cardSubtle}>
              {activePartyMembers.length} in the room
            </Text>
          </View>
          <View style={styles.multiplierBadge}>
            <Text style={styles.multiplierText}>{partyMultiplier.toFixed(1)}x</Text>
          </View>
        </View>

        <View style={styles.partyPeopleRow}>
          <View style={styles.avatarTrail}>
            {activePartyMembers.slice(0, 4).map(member => (
              <View key={member.id} style={styles.partyAvatar}>
                <Text style={styles.avatarText}>{member.name.slice(0, 1)}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cardSubtle} numberOfLines={1}>
            {activePartyMembers.map(member => member.name).join(', ')}
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Room focus</Text>
        {activePartyAssignments.length > 0 ? (
          <View style={styles.partyTaskList}>
            {activePartyAssignments.map(assignment => (
              <TouchableOpacity
                key={assignment.id}
                style={[styles.partyTaskButton, partyTaskId === assignment.id && styles.partyTaskButtonActive]}
                onPress={() => setPartyTaskId(assignment.id)}
                activeOpacity={0.85}
              >
                <View style={styles.profileHeadingText}>
                  <Text style={styles.partyTaskTitle}>{assignment.title}</Text>
                  <Text style={styles.cardSubtle}>
                    {assignment.className} - {assignment.goalHours}h - Added by {assignment.owner}
                  </Text>
                  {partyTaskId === assignment.id && <Text style={styles.activeAssignmentText}>Current room focus</Text>}
                  {partyTaskId === assignment.id && <Text style={styles.partyTaskDetails}>{assignment.details}</Text>}
                </View>
                <FontAwesome5 name="chevron-right" size={12} color={theme.secondary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          renderEmptyPanel({
            icon: 'tasks',
            title: 'No room focus yet',
            body: 'Add what the room is working on.',
            steps: ['Name the exam, homework, or project', 'Set a focus time'],
          })
        )}

        {isHost && (
          <View style={styles.hostPanel}>
            <Text style={styles.hostTitle}>Host controls</Text>
            <Text style={styles.hostSub}>Manage requests, members, and focus.</Text>

            <Text style={styles.sectionLabel}>Join requests</Text>
            {pendingRoomProfiles.length > 0 ? (
              pendingRoomProfiles.map(profile => (
                <View key={profile.id} style={styles.hostRow}>
                  <View style={styles.profileTitleRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.profileHeadingText}>
                      <Text style={styles.cardName}>{profile.name}</Text>
                      <Text style={styles.cardSubtle}>{profile.major}</Text>
                    </View>
                  </View>
                  <View style={styles.hostActions}>
                    <TouchableOpacity style={styles.smallButton} onPress={() => handleApproveRoomRequest(profile.id)} accessibilityLabel={`Approve ${profile.name}`} accessibilityRole="button">
                      <Text style={styles.smallButtonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.denyButton} onPress={() => handleDenyRoomRequest(profile.id)} accessibilityLabel={`Deny ${profile.name}`} accessibilityRole="button">
                      <Text style={styles.denyButtonText}>Deny</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No one is waiting right now.</Text>
            )}

            <Text style={styles.sectionLabel}>Members</Text>
            {activePartyMembers.filter(member => member.id !== 'you').map(member => (
              <View key={member.id} style={styles.hostRow}>
                <View style={styles.profileTitleRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.name.slice(0, 1)}</Text>
                  </View>
                  <View style={styles.profileHeadingText}>
                    <Text style={styles.cardName}>{member.name}</Text>
                    <Text style={styles.cardSubtle}>{member.major}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveRoomMember(member.id)} accessibilityLabel={`Remove ${member.name} from room`} accessibilityRole="button">
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={styles.closeRoomButton} onPress={handleCloseRoom} activeOpacity={0.85} accessibilityLabel="Close this study room" accessibilityRole="button">
              <Text style={styles.closeRoomButtonText}>Close room</Text>
            </TouchableOpacity>
          </View>
        )}

        <PixelButton
          size="lg"
          onPress={handleStartPartyFocus}
          leftIcon={<FontAwesome5 name="play" size={13} color={theme.onPrimary} />}
        >
          Start focus
        </PixelButton>
        <PixelButton variant="danger" onPress={handleLeaveParty}>Leave study group</PixelButton>
      </View>
    );
  };

  const renderStudyRooms = () => {
    if (activePartyRoom) {
      return (
        <View style={styles.cardList}>
          {renderActiveParty()}
        </View>
      );
    }

    if (selectedRoom) {
      return (
        <View style={styles.cardList}>
          <View style={styles.serverPreview}>
            <View style={styles.serverBanner}>
              <TouchableOpacity style={styles.serverBackButton} onPress={() => setSelectedRoom(null)} activeOpacity={0.85} accessibilityLabel="Back to room list" accessibilityRole="button">
                <FontAwesome5 name="chevron-left" size={13} color={theme.text} />
              </TouchableOpacity>
              <View style={styles.serverBadge}>
                <FontAwesome5 name="door-open" size={22} color={theme.onPrimary} />
              </View>
              <Text style={styles.serverKicker}>Room preview</Text>
              <Text style={styles.serverTitle}>{selectedRoom.name}</Text>
              <Text style={styles.serverSubtitle}>{selectedRoom.subject}</Text>
              <View style={styles.serverStatusRow}>
                <Text style={styles.serverStatusPill}>{selectedRoom.approvalRequired ? 'Approval needed' : 'Open join'}</Text>
                {selectedRoom.friendsOnly && <Text style={styles.serverStatusPill}>Friends only</Text>}
              </View>
            </View>

            <View style={styles.previewInfo}>
              <View style={styles.previewInfoRow}>
                <FontAwesome5 name="clock" size={12} color={theme.primary} />
                <Text style={styles.previewInfoText}>{selectedRoom.available} · {selectedRoom.duration}</Text>
              </View>
              <View style={styles.previewInfoRow}>
                <FontAwesome5 name="map-marker-alt" size={12} color={theme.primary} />
                <Text style={styles.previewInfoText}>{selectedRoom.floor} · {selectedRoom.capacity}</Text>
              </View>
              {!!selectedRoom.assignments[0] && (
                <View style={styles.previewInfoRow}>
                  <FontAwesome5 name="book-open" size={12} color={theme.primary} />
                  <Text style={styles.previewInfoText} numberOfLines={1}>
                    {selectedRoom.assignments[0].title} · {selectedRoom.assignments[0].goalHours}h
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.listLabel}>Members — {selectedRoomMembers.length}</Text>
            {selectedRoomMembers.length > 0 ? (
              selectedRoomMembers.map(profile => (
                <View key={profile.id} style={styles.personRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
                  </View>
                  <View style={styles.personCopy}>
                    <Text style={styles.cardName}>{profile.name}</Text>
                    <Text style={styles.cardSubtle}>{profile.major}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No students have joined yet.</Text>
            )}

            <View style={styles.serverActionDock}>
              <PixelButton
                fullWidth
                variant="surface"
                onPress={() => handleMessageRoom(selectedRoom)}
                accessibilityLabel={`Message ${selectedRoom.name}`}
                leftIcon={<FontAwesome5 name="comment-dots" size={13} color={theme.text} />}
              >
                Message
              </PixelButton>
              <PixelButton fullWidth disabled={joiningRoomId === selectedRoom.id} onPress={() => handleConfirmJoin(selectedRoom)}>
                {joiningRoomId === selectedRoom.id ? 'Connecting...' : selectedRoom.approvalRequired ? 'Confirm request' : 'Confirm join'}
              </PixelButton>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.cardList}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Library rooms</Text>
            <Text style={styles.sectionHint}>Pick a room with a clear time and goal.</Text>
          </View>
          <Text style={styles.countPill}>{studyRooms.length}</Text>
        </View>

        <PixelButton style={styles.createRoomButton} onPress={() => setShowRoomForm(current => !current)}>
          {showRoomForm ? 'Cancel' : 'Create room'}
        </PixelButton>

        {showRoomForm && (
          <View style={styles.roomForm}>
            <Text style={styles.profileTitle}>Create a study room</Text>
            <Text style={styles.profileSub}>Add the goal, time, and place.</Text>
            {renderField({
              value: roomName,
              onChangeText: text => {
                setRoomName(text);
                clearRoomError('roomName');
              },
              placeholder: 'Room name',
              error: roomErrors.roomName,
              maxLength: 50,
            })}
            {renderField({
              value: roomSubject,
              onChangeText: text => {
                setRoomSubject(text);
                clearRoomError('roomSubject');
              },
              placeholder: 'Subject or class',
              error: roomErrors.roomSubject,
              maxLength: 70,
            })}
            {renderField({
              value: roomLocation,
              onChangeText: text => {
                setRoomLocation(text);
                clearRoomError('roomLocation');
              },
              placeholder: 'Library room or location',
              error: roomErrors.roomLocation,
              maxLength: 70,
            })}
            {renderField({
              value: roomTime,
              onChangeText: text => {
                setRoomTime(text);
                clearRoomError('roomTime');
              },
              placeholder: 'Meeting time',
              error: roomErrors.roomTime,
              maxLength: 60,
            })}
            {renderField({
              value: roomDuration,
              onChangeText: text => {
                setRoomDuration(text);
                clearRoomError('roomDuration');
              },
              placeholder: 'Session length',
              error: roomErrors.roomDuration,
              maxLength: 40,
            })}
            <View style={styles.twoColumn}>
              {renderField({
                value: roomCapacity,
                onChangeText: text => {
                  setRoomCapacity(text.replace(/[^\d]/g, ''));
                  clearRoomError('roomCapacity');
                },
                placeholder: 'Capacity',
                error: roomErrors.roomCapacity,
                maxLength: 2,
                keyboardType: 'number-pad',
                containerStyle: styles.halfInput,
              })}
              {renderField({
                value: roomVibe,
                onChangeText: text => {
                  setRoomVibe(text);
                  clearRoomError('roomVibe');
                },
                placeholder: 'Vibe',
                error: roomErrors.roomVibe,
                maxLength: 80,
                containerStyle: styles.halfInput,
              })}
            </View>

            <Text style={styles.sectionLabel}>Privacy</Text>
            <TouchableOpacity style={[styles.privacyRow, approvalRequired && styles.privacyRowActive]} onPress={() => setApprovalRequired(current => !current)} activeOpacity={0.85} accessibilityLabel={`Require approval to join: ${approvalRequired ? 'on' : 'off'}`} accessibilityRole="switch">
              <View style={[styles.toggleDot, approvalRequired && styles.toggleDotActive]} />
              <View style={styles.privacyTextWrap}>
                <Text style={[styles.privacyTitle, approvalRequired && styles.privacyTitleActive]}>Require approval to join</Text>
                <Text style={[styles.privacySub, approvalRequired && styles.privacySubActive]}>You approve requests.</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.privacyRow, friendsOnly && styles.privacyRowActive]} onPress={() => setFriendsOnly(current => !current)} activeOpacity={0.85} accessibilityLabel={`Show to friends only: ${friendsOnly ? 'on' : 'off'}`} accessibilityRole="switch">
              <View style={[styles.toggleDot, friendsOnly && styles.toggleDotActive]} />
              <View style={styles.privacyTextWrap}>
                <Text style={[styles.privacyTitle, friendsOnly && styles.privacyTitleActive]}>Show to friends only</Text>
                <Text style={[styles.privacySub, friendsOnly && styles.privacySubActive]}>Only friends can see it.</Text>
              </View>
            </TouchableOpacity>

            <PixelButton onPress={handleCreateRoom}>Create room</PixelButton>
          </View>
        )}

        {studyRooms.map(room => (
          <TouchableOpacity
            key={room.id}
            style={styles.roomRow}
            onPress={() => setSelectedRoom(room)}
            activeOpacity={0.85}
            accessibilityLabel={`Open ${room.name}`}
            accessibilityRole="button"
          >
            <View style={styles.roomRowIcon}>
              <FontAwesome5 name="door-open" size={15} color={theme.primary} />
            </View>
            <View style={styles.personCopy}>
              <View style={styles.personNameRow}>
                <Text style={styles.cardName} numberOfLines={1}>{room.name}</Text>
                {room.friendsOnly && <FontAwesome5 name="lock" size={10} color={theme.muted} />}
              </View>
              <Text style={styles.cardSubtle} numberOfLines={1}>
                {room.subject} · {room.available}
              </Text>
            </View>
            <View style={styles.roomRowRight}>
              <View style={styles.roomCountPill}>
                <FontAwesome5 name="users" size={10} color={theme.muted} />
                <Text style={styles.roomCountText}>{room.memberIds.length}</Text>
              </View>
              <Text style={styles.roomJoinText}>{room.approvalRequired ? 'Request' : 'Join'}</Text>
            </View>
          </TouchableOpacity>
        ))}
        {studyRooms.length === 0 && !showRoomForm && renderEmptyPanel({
          icon: 'door-open',
          title: 'No study rooms yet',
          body: 'Create a room when you know the goal, time, and place.',
          steps: ['Add the class or exam', 'Pick time and place'],
          action: (
            <PixelButton variant="surface" onPress={() => setShowRoomForm(true)}>
              Create first room
            </PixelButton>
          ),
        })}
      </View>
    );
  };
  const renderBrowse = () => {
    if (editingProfile) {
      return renderProfileSetup();
    }
    if (activeBrowseTab === 'Library rooms' && (selectedRoom || activePartyRoom)) {
      return renderStudyRooms();
    }

    return (
    <>
      <View style={styles.socialHeader}>
        <View style={styles.socialTitleBlock}>
          <TouchableOpacity
            style={styles.schoolSwitchButton}
            onPress={() => {
              setSchoolSearch(selectedSchool || theme.name || '');
              setShowSchoolSwitcher(current => !current);
            }}
            activeOpacity={0.85}
            accessibilityLabel="Switch school"
          >
            <Text style={styles.socialSchool}>{theme.name || selectedSchool}</Text>
            <FontAwesome5 name={showSchoolSwitcher ? 'chevron-up' : 'chevron-down'} size={10} color={theme.muted} />
          </TouchableOpacity>
          <Text style={styles.socialTitle}>Study groups</Text>
        </View>
        <View style={styles.socialHeaderActions}>
          <TouchableOpacity
            style={styles.socialIconButton}
            onPress={() => setEditingProfile(true)}
            activeOpacity={0.85}
            accessibilityLabel="Edit your profile"
            accessibilityRole="button"
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.headerAvatar} />
            ) : (
              <FontAwesome5 name="user" size={14} color={theme.text} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.socialIconButton}
            onPress={() => setProfileHidden(current => !current)}
            activeOpacity={0.85}
            accessibilityLabel={profileHidden ? 'Show your profile' : 'Hide your profile'}
          >
            <FontAwesome5 name={profileHidden ? 'eye-slash' : 'eye'} size={14} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.socialIconButton, styles.socialIconButtonPrimary]}
            onPress={() => {
              setActiveBrowseTab('Library rooms');
              setShowRoomForm(true);
            }}
            activeOpacity={0.85}
            accessibilityLabel="Create study room"
          >
            <FontAwesome5 name="plus" size={14} color={theme.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {showSchoolSwitcher && (
        <View style={styles.schoolSwitcherPanel}>
          <View style={styles.schoolSwitcherHeader}>
            <View>
              <Text style={styles.panelTitle}>Switch school</Text>
              <Text style={styles.schoolSwitcherSub}>Your app colors update right away.</Text>
            </View>
            <TouchableOpacity
              style={styles.schoolSwitcherClose}
              onPress={() => setShowSchoolSwitcher(false)}
              activeOpacity={0.85}
              accessibilityLabel="Close school switcher"
            >
              <FontAwesome5 name="times" size={12} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <TextInput
            value={schoolSearch}
            onChangeText={setSchoolSearch}
            placeholder="Search schools"
            placeholderTextColor={theme.muted}
            style={[styles.input, styles.schoolSwitcherInput]}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <View style={styles.schoolSwitcherList}>
            {(filteredSchools.length > 0 ? filteredSchools : [schoolSearch.trim()]).slice(0, 5).map(school => (
              <TouchableOpacity
                key={school}
                style={[styles.schoolOption, selectedSchool === school && styles.schoolSwitcherOptionActive]}
                onPress={() => handleSelectSchool(school)}
                activeOpacity={0.8}
              >
                <View style={styles.schoolOptionSwatches}>
                  {(SCHOOL_COLOR_SWATCHES[school] ?? [theme.primary, theme.secondary]).map(color => (
                    <View key={color} style={[styles.schoolOptionSwatch, { backgroundColor: color }]} />
                  ))}
                </View>
                <Text style={styles.schoolOptionText}>{selectedSchool === school ? `${school} current` : school}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.socialTabBar}>
        {BROWSE_TABS.map(tab => {
          const meta = BROWSE_TAB_META[tab];
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.socialTab, activeBrowseTab === tab && styles.socialTabActive]}
              onPress={() => setActiveBrowseTab(tab)}
              activeOpacity={0.86}
              accessibilityLabel={meta.label}
              accessibilityRole="tab"
            >
              <FontAwesome5 name={meta.icon} size={14} color={activeBrowseTab === tab ? theme.onPrimary : theme.muted} />
              <Text style={[styles.socialTabText, activeBrowseTab === tab && styles.socialTabTextActive]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {activeBrowseTab === 'Profiles'
        ? renderProfiles()
        : activeBrowseTab === 'Feed'
          ? renderFeed()
          : renderStudyRooms()}
    </>
    );
  };
  const isProfileSetup = !profileCreated && isSearching && !!selectedSchool && showProfileSetup;
  const isSchoolConfirmation = !profileCreated && isSearching && !!selectedSchool && !showProfileSetup;

  return (
    <ArcadeTabScreen index={2} style={styles.root}>
      <PixelBackdrop />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {!profileCreated && (
        <View style={[styles.hero, (isProfileSetup || isSchoolConfirmation) && styles.heroCompact]}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.kicker}>Campus</Text>
              <Text style={styles.heading}>Study Groups</Text>
              {!isProfileSetup && !isSchoolConfirmation && (
                <Text style={styles.description}>
                  Join or create a study room.
                </Text>
              )}
            </View>
            <View style={styles.heroIcon}>
              <FontAwesome5 name="user-graduate" size={24} color={theme.onPrimary} />
            </View>
          </View>
          {!isProfileSetup && !isSchoolConfirmation && (
            <View style={styles.lobbySignals}>
              <View>
                <Text style={styles.lobbySignalValue}>3</Text>
                <Text style={styles.lobbySignalLabel}>rooms</Text>
              </View>
              <View style={styles.lobbySignalDivider} />
              <View>
                <Text style={styles.lobbySignalValue}>2</Text>
                <Text style={styles.lobbySignalLabel}>friends</Text>
              </View>
              <View style={styles.lobbySignalDivider} />
              <View>
                <Text style={styles.lobbySignalValue}>Open</Text>
                <Text style={styles.lobbySignalLabel}>study groups</Text>
              </View>
            </View>
          )}
        </View>
      )}

      <MotionNotice
        message={motionNotice}
        accentColor={theme.primary}
        textColor={theme.onPrimary}
      />

      {profileCreated ? (
        renderBrowse()
      ) : !isSearching ? (
        <View style={styles.startPanel}>
          <Text style={styles.panelTitle}>Choose your school</Text>
          <Text style={styles.profileSub}>Find classmates and library rooms on your campus.</Text>
          <TouchableOpacity style={styles.beginButton} onPress={() => setIsSearching(true)} activeOpacity={0.82} accessibilityLabel="Choose your school" accessibilityRole="button">
            <FontAwesome5 name="search-location" size={16} color={theme.onPrimary} />
            <Text style={styles.beginButtonText}>Choose school</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.panel}>
          {selectedSchool ? (
            showProfileSetup ? renderProfileSetup() : renderSchoolConfirmation()
          ) : (
            <>
              <Text style={styles.panelTitle}>Choose your school</Text>
              <Text style={styles.profileSub}>Start typing or pick one below.</Text>
              <TextInput
                value={schoolSearch}
                onChangeText={text => {
                  setSchoolSearch(text);
                  setSelectedSchool('');
                }}
                placeholder="School name"
                placeholderTextColor={theme.muted}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <Text style={styles.sectionLabel}>Suggested schools</Text>
              <View style={styles.schoolList}>
                {filteredSchools.length > 0 ? (
                  filteredSchools.map(school => (
                    <TouchableOpacity key={school} style={styles.schoolOption} onPress={() => handleSelectSchool(school)} activeOpacity={0.8}>
                      <View style={styles.schoolOptionSwatches}>
                        {(SCHOOL_COLOR_SWATCHES[school] ?? [theme.primary, theme.secondary]).map(color => (
                          <View key={color} style={[styles.schoolOptionSwatch, { backgroundColor: color }]} />
                        ))}
                      </View>
                      <Text style={styles.schoolOptionText}>{school}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <TouchableOpacity style={styles.schoolOption} onPress={() => handleSelectSchool(schoolSearch.trim())} activeOpacity={0.8}>
                    <Text style={styles.schoolOptionText}>{`Use ${schoolSearch.trim()}`}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      )}
      </ScrollView>
    </ArcadeTabScreen>
  );
}

const DANGER_RED = '#EF4444';

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.background },
  scroll: { flex: 1 },
  container: { paddingHorizontal: 18, paddingTop: 36, paddingBottom: 118 },
  hero: {
    paddingTop: 4,
    paddingBottom: 18,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  heroCompact: { marginBottom: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  heroCopy: { flex: 1 },
  kicker: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroIcon: { display: 'none' },
  heading: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  description: { color: theme.muted, fontSize: 15, lineHeight: 22 },
  lobbySignals: { display: 'none' },
  lobbySignalValue: { color: theme.text, fontSize: 15, fontWeight: '700' },
  lobbySignalLabel: { color: theme.muted, fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  lobbySignalDivider: { width: 1, height: 32, backgroundColor: theme.border },
  startPanel: { paddingTop: 4 },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.primary,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.3)',
    borderLeftColor: 'rgba(255,255,255,0.3)',
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRightColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  beginButtonText: {
    color: theme.onPrimary,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  panel: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 16 },
  panelTitle: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.32)',
    borderLeftColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
    color: theme.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  fieldWrap: { marginBottom: 12 },
  fieldMetaRow: { minHeight: 17, marginTop: 5 },
  twoColumn: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  sectionLabel: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  schoolList: { gap: 8 },
  schoolOption: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderBottomWidth: 1, borderColor: theme.border, paddingHorizontal: 0, paddingVertical: 13 },
  schoolOptionSwatches: { width: 34, height: 22, flexDirection: 'row', overflow: 'hidden', borderRadius: 2, borderWidth: 1, borderColor: theme.border },
  schoolOptionSwatch: { flex: 1 },
  schoolOptionText: { color: theme.text, fontSize: 15, fontWeight: '600' },
  profileSection: { marginTop: 0 },
  profileSetupPanel: {
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    padding: 14,
    marginBottom: 16,
  },
  profileMiniSchool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    paddingBottom: 12,
    marginBottom: 14,
  },
  selectedSchool: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 12, marginBottom: 18 },
  selectedSchoolTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  changeSchoolButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginLeft: 'auto',
    paddingHorizontal: 4,
  },
  changeSchoolText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  selectedSchoolLabel: { color: theme.primary, fontSize: 11, fontWeight: '700', marginBottom: 3, textTransform: 'uppercase' },
  selectedSchoolText: { color: theme.text, fontSize: 15, fontWeight: '700' },
  schoolSwatches: { width: 48, height: 28, flexDirection: 'row', overflow: 'hidden', borderRadius: 2, borderWidth: 1, borderColor: theme.border },
  schoolSwatch: { flex: 1 },
  schoolConfirm: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 16, marginBottom: 18 },
  schoolConfirmCopy: { flex: 1 },
  schoolConfirmTitle: { color: theme.text, fontSize: 22, fontWeight: '600', marginBottom: 5 },
  schoolConfirmText: { color: theme.muted, fontSize: 13, lineHeight: 19, maxWidth: 280 },
  onboardingNext: { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 16, gap: 10 },
  profileComposerHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  profileAvatarButton: { width: 78, height: 78, borderRadius: 4 },
  profileAvatarImage: { width: 78, height: 78, borderRadius: 4 },
  profileAvatarEmpty: {
    width: 78,
    height: 78,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  profileAvatarInitial: { color: theme.text, fontSize: 28, fontWeight: '700' },
  profilePhotoBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderWidth: 2,
    borderColor: theme.surface,
  },
  profileIntroCopy: { flex: 1 },
  profileIntroSub: { marginBottom: 0 },
  profileFormBlock: { marginBottom: 2 },
  profilePreviewLine: {
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  previewName: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  previewMeta: { color: theme.muted, fontSize: 13, lineHeight: 18 },
  profileTitle: { color: theme.text, fontSize: 20, fontWeight: '600', marginBottom: 5 },
  profileSub: { color: theme.muted, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  profileExtrasToggle: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingHorizontal: 0, marginBottom: 12 },
  profileExtrasText: { color: theme.text, fontSize: 13, fontWeight: '700' },
  profileExtras: { marginBottom: 4 },
  compactActionButton: { marginTop: 0 },
  createRoomButton: { marginTop: 0 },
  socialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  socialTitleBlock: { flex: 1 },
  socialSchool: { color: theme.muted, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  socialTitle: { color: theme.text, fontSize: 25, fontWeight: '700' },
  socialHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  schoolSwitchButton: {
    alignSelf: 'flex-start',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingRight: 8,
  },
  schoolSwitcherPanel: {
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 13,
    marginTop: 12,
    marginBottom: 12,
  },
  schoolSwitcherHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  schoolSwitcherSub: { color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  schoolSwitcherClose: {
    width: 34,
    height: 34,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  schoolSwitcherInput: { marginBottom: 4 },
  schoolSwitcherList: { gap: 2 },
  schoolSwitcherOptionActive: {
    borderBottomColor: theme.primary,
  },
  socialIconButton: {
    width: 44,
    height: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  socialIconButtonPrimary: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 2,
  },
  storyScroller: { marginHorizontal: -18, marginTop: 14, marginBottom: 12 },
  storyRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingRight: 28 },
  storyItem: { width: 70, alignItems: 'center', gap: 7 },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.primary,
    backgroundColor: theme.background,
  },
  storyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  storyImage: { width: 52, height: 52, borderRadius: 4 },
  storyLabel: { width: '100%', color: theme.text, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  socialTabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    marginBottom: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.border,
  },
  socialTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  socialTabActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  socialTabText: { color: theme.muted, fontSize: 11, fontWeight: '700' },
  socialTabTextActive: { color: theme.onPrimary },
  cardList: { gap: 12 },
  listLabel: {
    color: theme.muted,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  personRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  personCopy: { flex: 1 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  requestPanel: {
    gap: 8,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    padding: 10,
  },
  roomRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.14)',
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderBottomColor: 'rgba(0,0,0,0.32)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  roomRowIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.12)',
    borderLeftColor: 'rgba(255,255,255,0.12)',
    borderBottomColor: 'rgba(0,0,0,0.3)',
    borderRightColor: 'rgba(0,0,0,0.3)',
  },
  roomRowRight: { alignItems: 'flex-end', gap: 5 },
  roomCountPill: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  roomCountText: {
    color: theme.muted,
    fontSize: 12,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
  },
  roomJoinText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '800',
    fontFamily: PIXEL_FONT,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  previewInfo: {
    gap: 10,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 2,
    borderTopColor: 'rgba(0,0,0,0.32)',
    borderLeftColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(255,255,255,0.14)',
    borderRightColor: 'rgba(255,255,255,0.14)',
    padding: 14,
  },
  previewInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewInfoText: { flex: 1, color: theme.text, fontSize: 13, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 2, marginBottom: 6 },
  sectionTitle: { color: theme.text, fontSize: 18, fontWeight: '600', marginBottom: 3 },
  sectionHint: { color: theme.muted, fontSize: 13, lineHeight: 18, maxWidth: 260 },
  countPill: { display: 'none' },
  filterToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: theme.surfaceAlt, borderRadius: 2, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 10 },
  filterToggleText: { color: theme.text, fontSize: 13, fontWeight: '600' },
  profileCard: { borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 15 },
  friendCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingVertical: 13 },
  avatar: { width: 44, height: 44, borderRadius: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt },
  avatarText: { color: theme.text, fontSize: 18, fontWeight: '700' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  profileTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileHeadingText: { flex: 1 },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { color: theme.text, fontSize: 16, fontWeight: '600' },
  cardMeta: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  cardMajor: { color: theme.primary, fontSize: 13, fontWeight: '700', marginTop: 3 },
  cardFact: { color: theme.muted, fontSize: 13, lineHeight: 19, marginTop: 10 },
  cardSubtle: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  iconButton: { minWidth: 44, height: 44, borderRadius: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 8 },
  iconButtonActive: { backgroundColor: theme.surface, borderColor: theme.primary },
  messageButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 9 },
  messageButtonText: { color: theme.text, fontSize: 12, fontWeight: '600' },
  metaChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  metaChip: { color: theme.muted, paddingRight: 10, paddingVertical: 4, fontSize: 12, fontWeight: '700' },
  cardFooterActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  approvalHint: { flex: 1, color: theme.muted, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  blockButton: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 2, borderWidth: 1, borderColor: DANGER_RED, paddingHorizontal: 11, paddingVertical: 8 },
  blockButtonText: { color: DANGER_RED, fontSize: 12, fontWeight: '700' },
  tag: { color: theme.primary, borderBottomWidth: 1, borderBottomColor: theme.border, overflow: 'hidden', paddingHorizontal: 0, paddingVertical: 5, fontSize: 12, fontWeight: '700' },
  emptyPanel: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 16, gap: 10 },
  emptyPanelFeatured: { padding: 18 },
  emptyIconBubble: { width: 48, height: 48, borderRadius: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, marginBottom: 2 },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
  emptyText: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  emptyStepList: { gap: 8, marginTop: 4, marginBottom: 4 },
  emptyStep: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  emptyStepNumber: { width: 22, height: 22, borderRadius: 2, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: theme.text, backgroundColor: theme.surfaceAlt, fontSize: 12, fontWeight: '700' },
  emptyStepText: { flex: 1, color: theme.text, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  requestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedCard: { backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, padding: 15 },
  feedKind: { alignSelf: 'flex-start', color: theme.primary, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border, borderRadius: 2, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700', marginBottom: 8 },
  commentList: { gap: 6, marginTop: 12 },
  commentText: { color: theme.text, backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, padding: 10, fontSize: 13, lineHeight: 18 },
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, marginBottom: 0 },
  roomForm: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 14 },
  partyCard: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 16, gap: 12 },
  partyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  partyTitle: { color: theme.text, fontSize: 20, fontWeight: '600', marginBottom: 3 },
  multiplierBadge: { minWidth: 58, borderRadius: 2, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  multiplierText: { color: theme.primary, fontSize: 16, fontWeight: '700' },
  partyPeopleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, padding: 10 },
  avatarTrail: { flexDirection: 'row', alignItems: 'center' },
  partyAvatar: { width: 36, height: 36, borderRadius: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.border },
  partyTaskList: { gap: 8 },
  partyTaskButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, padding: 12 },
  partyTaskButtonActive: { borderColor: theme.primary, backgroundColor: theme.surfaceAlt },
  partyTaskTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 3 },
  activeAssignmentText: { alignSelf: 'flex-start', color: theme.primary, backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border, borderRadius: 2, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: '700', marginTop: 7 },
  partyTaskDetails: { color: theme.muted, fontSize: 12, lineHeight: 17, marginTop: 6 },
  hostPanel: { backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, padding: 14, gap: 10 },
  hostTitle: { color: theme.text, fontSize: 18, fontWeight: '700' },
  hostSub: { color: theme.muted, fontSize: 13, lineHeight: 18, marginTop: -6 },
  hostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: theme.surface, borderRadius: 2, borderWidth: 1, borderColor: theme.border, padding: 10 },
  hostActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  denyButton: { minHeight: 44, justifyContent: 'center', backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 8 },
  denyButtonText: { color: theme.text, fontSize: 12, fontWeight: '700' },
  removeButton: { minHeight: 44, justifyContent: 'center', borderRadius: 2, borderWidth: 1, borderColor: DANGER_RED, paddingHorizontal: 12, paddingVertical: 8 },
  removeButtonText: { color: DANGER_RED, fontSize: 12, fontWeight: '700' },
  closeRoomButton: { alignItems: 'center', borderRadius: 2, backgroundColor: DANGER_RED, paddingHorizontal: 16, paddingVertical: 13, marginTop: 4 },
  closeRoomButtonText: { color: theme.onPrimary, fontSize: 14, fontWeight: '700' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surfaceAlt, borderRadius: 2, borderWidth: 1, borderColor: theme.border, padding: 12, marginBottom: 10 },
  privacyRowActive: { backgroundColor: theme.surface, borderColor: theme.primary },
  toggleDot: { width: 22, height: 22, borderRadius: 2, borderWidth: 2, borderColor: theme.border },
  toggleDotActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  privacyTextWrap: { flex: 1 },
  privacyTitle: { color: theme.text, fontSize: 14, fontWeight: '700', marginBottom: 3 },
  privacyTitleActive: { color: theme.text },
  privacySub: { color: theme.muted, fontSize: 12, lineHeight: 17 },
  privacySubActive: { color: theme.muted, opacity: 1 },
  serverPreview: {
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  serverBanner: {
    minHeight: 190,
    backgroundColor: theme.surfaceAlt,
    padding: 16,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  serverBackButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  serverBadge: {
    width: 62,
    height: 62,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
    borderWidth: 4,
    borderColor: theme.surfaceAlt,
    marginBottom: 12,
  },
  serverKicker: { color: theme.primary, fontSize: 12, fontWeight: '800', marginBottom: 4, textTransform: 'uppercase' },
  serverTitle: { color: theme.text, fontSize: 25, fontWeight: '800', lineHeight: 30 },
  serverSubtitle: { color: theme.muted, fontSize: 14, fontWeight: '700', marginTop: 3 },
  serverStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  serverStatusPill: {
    color: theme.text,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '800',
  },
  serverQuickGrid: { flexDirection: 'row', gap: 10, padding: 12 },
  serverQuickItem: {
    flex: 1,
    minHeight: 106,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  serverQuickLabel: { color: theme.muted, fontSize: 11, fontWeight: '800', marginTop: 8, marginBottom: 5, textTransform: 'uppercase' },
  serverQuickValue: { color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 18 },
  serverQuickMuted: { color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 16, marginTop: 3 },
  serverSection: { paddingHorizontal: 12, paddingBottom: 12 },
  serverSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  serverSectionTitle: { color: theme.muted, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  serverMemberCount: { marginLeft: 'auto', color: theme.muted, fontSize: 12, fontWeight: '800' },
  serverFocusCard: {
    flexDirection: 'row',
    gap: 11,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  serverFocusIcon: {
    width: 38,
    height: 38,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  serverChatPreview: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 8,
  },
  serverChatLine: { color: theme.muted, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  serverMemberList: { gap: 8 },
  serverMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 10,
  },
  serverActionDock: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    backgroundColor: theme.surface,
  },
  roomCard: {
    backgroundColor: theme.surface,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
  },
  roomPostHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 11 },
  roomPostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  roomPostMedia: {
    minHeight: 118,
    borderRadius: 2,
    backgroundColor: theme.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    justifyContent: 'space-between',
  },
  roomPostMediaTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  roomPostSubject: { flex: 1, color: theme.text, fontSize: 20, fontWeight: '800', lineHeight: 24 },
  roomTimePill: { alignSelf: 'flex-start', color: theme.primary, backgroundColor: theme.surface, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '800' },
  roomAssignmentPreview: { color: theme.text, fontSize: 14, fontWeight: '800', lineHeight: 19, marginTop: 12 },
  roomPostMeta: { color: theme.muted, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 8 },
  roomPostActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 11 },
  roomPostLeftActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  roomPostActionText: { color: theme.text, fontSize: 13, fontWeight: '700' },
  roomPostCaption: { color: theme.muted, fontSize: 13, lineHeight: 19, marginTop: 9 },
  roomPostCaptionStrong: { color: theme.text, fontWeight: '800' },
  roomFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  roomOpenText: { marginLeft: 'auto', color: theme.primary, fontSize: 13, fontWeight: '800' },
  smallButton: { minHeight: 44, justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: theme.onPrimary, fontSize: 12, fontWeight: '700' },
});
