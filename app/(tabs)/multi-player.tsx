import * as ImagePicker from 'expo-image-picker';
import { SchoolTheme, useSchoolTheme } from '@/context/SchoolThemeContext';
import { FontAwesome5 } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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

const MEETING_OPTIONS = ['In person', 'Online', 'Either'];
const STUDY_OPTIONS = ['Homework', 'Exam prep', 'Projects', 'Accountability'];
const BROWSE_TABS = ['Profiles', 'Friends', 'Feed', 'Library rooms'] as const;
const FILTER_OPTIONS = ['All', 'Same major', 'Online', 'In person', 'Exam prep', 'Projects'];

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
  const { theme, setSchoolTheme } = useSchoolTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isSearching, setIsSearching] = useState(false);
  const [profileCreated, setProfileCreated] = useState(false);
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
  const [meetingPreference, setMeetingPreference] = useState('Either');
  const [studyFocus, setStudyFocus] = useState('Homework');
  const [activeBrowseTab, setActiveBrowseTab] = useState<(typeof BROWSE_TABS)[number]>('Profiles');
  const [activeFilter, setActiveFilter] = useState('All');
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
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<StudyRoom | null>(null);
  const [helpPosts, setHelpPosts] = useState<HelpPost[]>(STARTING_POSTS);
  const [helpTopic, setHelpTopic] = useState('');
  const [helpDetails, setHelpDetails] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const filteredSchools = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    if (!query) return SCHOOL_OPTIONS;
    return SCHOOL_OPTIONS.filter(school => school.toLowerCase().includes(query));
  }, [schoolSearch]);

  const filteredProfiles = useMemo(() => {
    return SAMPLE_PROFILES.filter(profile => !blockedIds.includes(profile.id)).filter(profile => {
      if (activeFilter === 'All') return true;
      if (activeFilter === 'Same major') {
        return major.trim() ? profile.major.toLowerCase().includes(major.trim().toLowerCase()) : true;
      }
      if (activeFilter === 'Online') return profile.meeting === 'Online' || profile.meeting === 'Either';
      if (activeFilter === 'In person') return profile.meeting === 'In person' || profile.meeting === 'Either';
      return profile.focus === activeFilter;
    });
  }, [activeFilter, blockedIds, major]);

  const pickProfileImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access so you can add a profile picture.');
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
  };

  const handleSaveProfile = () => {
    if (!name.trim() || !major.trim() || !age.trim()) {
      Alert.alert('Almost done', 'Please add your name, major, and age before saving.');
      return;
    }
    setProfileCreated(true);
  };

  const handleAddFriend = (profile: StudentProfile) => {
    if (friendIds.includes(profile.id) || pendingFriendIds.includes(profile.id)) return;
    setPendingFriendIds(current => [...current, profile.id]);
    Alert.alert('Friend request sent', `${profile.name} will need to approve your request.`);
  };

  const handleApproveFriend = (profileId: string) => {
    setIncomingFriendIds(current => current.filter(id => id !== profileId));
    setFriendIds(current => current.includes(profileId) ? current : [...current, profileId]);
  };

  const handleMessage = (profile: StudentProfile) => {
    Alert.alert('Message', `Start a chat with ${profile.name}.`);
  };

  const handleBlockStudent = (profile: StudentProfile) => {
    setBlockedIds(current => current.includes(profile.id) ? current : [...current, profile.id]);
    setFriendIds(current => current.filter(id => id !== profile.id));
    setPendingFriendIds(current => current.filter(id => id !== profile.id));
    setIncomingFriendIds(current => current.filter(id => id !== profile.id));
    Alert.alert('Student blocked', `${profile.name} will no longer appear in your profiles or friends list.`);
  };

  const handleCreateRoom = () => {
    if (!roomName.trim() || !roomLocation.trim() || !roomTime.trim() || !roomDuration.trim()) {
      Alert.alert('Almost done', 'Please add a room name, location, meeting time, and duration.');
      return;
    }

    const room: StudyRoom = {
      id: `room-${Date.now()}`,
      name: roomName.trim(),
      floor: roomLocation.trim(),
      capacity: roomCapacity.trim() || 'Open capacity',
      vibe: roomVibe.trim() || 'Study session',
      available: roomTime.trim(),
      duration: roomDuration.trim(),
      subject: roomSubject.trim() || major.trim() || 'General study',
      approvalRequired,
      friendsOnly,
      host: name.trim(),
      memberIds: [],
    };

    setStudyRooms(current => [room, ...current]);
    setRoomName('');
    setRoomSubject('');
    setRoomLocation('');
    setRoomTime('');
    setRoomDuration('');
    setRoomCapacity('');
    setRoomVibe('');
    setApprovalRequired(true);
    setFriendsOnly(false);
    setShowRoomForm(false);
  };

  const handleMessageRoom = (room: StudyRoom) => {
    Alert.alert('Message room', `Ask ${room.name} a question before joining.`);
  };

  const handleConfirmJoin = (room: StudyRoom) => {
    const action = room.approvalRequired ? 'request sent' : 'joined';
    Alert.alert('Done', `You ${action} ${room.name}.`);
    setSelectedRoom(null);
  };

  const handleCreateHelpPost = () => {
    if (!helpTopic.trim() || !helpDetails.trim()) {
      Alert.alert('Almost done', 'Add what you need help with and a short detail.');
      return;
    }

    setHelpPosts(current => [{
      id: `post-${Date.now()}`,
      author: name.trim() || 'You',
      major: major.trim() || 'Student',
      kind: 'Help',
      topic: helpTopic.trim(),
      details: helpDetails.trim(),
      time: 'Just now',
      comments: [],
    }, ...current]);
    setHelpTopic('');
    setHelpDetails('');
  };

  const handleAddComment = (postId: string) => {
    const comment = commentDrafts[postId]?.trim();
    if (!comment) return;
    setHelpPosts(current => current.map(post => (
      post.id === postId ? { ...post, comments: [...post.comments, comment] } : post
    )));
    setCommentDrafts(current => ({ ...current, [postId]: '' }));
  };

  const renderProfileSetup = () => (
    <View style={styles.profileSection}>
      <View style={styles.selectedSchool}>
        <Text style={styles.selectedSchoolLabel}>School</Text>
        <Text style={styles.selectedSchoolText}>{selectedSchool}</Text>
      </View>

      <Text style={styles.profileTitle}>Create your study profile</Text>
      <Text style={styles.profileSub}>Help classmates know who they might study with.</Text>

      <TouchableOpacity style={styles.photoButton} onPress={pickProfileImage} activeOpacity={0.85}>
        {profileImage ? (
          <Image source={{ uri: profileImage }} style={styles.profileImage} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoInitials}>+</Text>
          </View>
        )}
        <View style={styles.photoTextWrap}>
          <Text style={styles.photoTitle}>Profile picture</Text>
          <Text style={styles.photoSub}>Add a clear photo of your face</Text>
        </View>
      </TouchableOpacity>

      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#666" style={styles.input} />
      <TextInput value={major} onChangeText={setMajor} placeholder="Major or field" placeholderTextColor="#666" style={styles.input} />
      <View style={styles.twoColumn}>
        <TextInput value={age} onChangeText={setAge} placeholder="Age" placeholderTextColor="#666" style={[styles.input, styles.halfInput]} keyboardType="number-pad" />
        <TextInput value={year} onChangeText={setYear} placeholder="Year" placeholderTextColor="#666" style={[styles.input, styles.halfInput]} />
      </View>
      <TextInput value={coolFact} onChangeText={setCoolFact} placeholder="Cool fact about you" placeholderTextColor="#666" style={[styles.input, styles.multiInput]} multiline />
      <TextInput value={studyGoal} onChangeText={setStudyGoal} placeholder="What do you want help studying?" placeholderTextColor="#666" style={styles.input} />
      <TextInput value={availability} onChangeText={setAvailability} placeholder="When are you usually free?" placeholderTextColor="#666" style={styles.input} />

      <Text style={styles.sectionLabel}>Preferred meeting style</Text>
      <View style={styles.choiceRow}>
        {MEETING_OPTIONS.map(option => (
          <TouchableOpacity key={option} style={[styles.choiceChip, meetingPreference === option && styles.choiceChipSelected]} onPress={() => setMeetingPreference(option)}>
            <Text style={[styles.choiceText, meetingPreference === option && styles.choiceTextSelected]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Looking for</Text>
      <View style={styles.choiceRow}>
        {STUDY_OPTIONS.map(option => (
          <TouchableOpacity key={option} style={[styles.choiceChip, studyFocus === option && styles.choiceChipSelected]} onPress={() => setStudyFocus(option)}>
            <Text style={[styles.choiceText, studyFocus === option && styles.choiceTextSelected]}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} activeOpacity={0.85}>
        <Text style={styles.saveButtonText}>Create profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProfiles = () => (
    <View style={styles.cardList}>
      {filteredProfiles.map(profile => {
        const isFriend = friendIds.includes(profile.id);
        const isPending = pendingFriendIds.includes(profile.id);
        return (
          <View key={profile.id} style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <View style={styles.profileTitleRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.profileHeadingText}>
                  <Text style={styles.cardName}>{profile.name}</Text>
                  <Text style={styles.cardMajor}>{profile.major}</Text>
                </View>
              </View>
              <View style={styles.profileActions}>
                <TouchableOpacity style={[styles.iconButton, (isFriend || isPending) && styles.iconButtonActive]} onPress={() => handleAddFriend(profile)}>
                  <Text style={styles.iconButtonText}>{isFriend ? '✓' : isPending ? '...' : '+'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.messageButton} onPress={() => handleMessage(profile)}>
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.cardFact}>{profile.year} - {profile.focus} - {profile.meeting}</Text>
            <Text style={styles.cardSubtle}>{profile.availability}</Text>
            <TouchableOpacity style={styles.blockButton} onPress={() => handleBlockStudent(profile)}>
              <Text style={styles.blockButtonText}>Block student</Text>
            </TouchableOpacity>
          </View>
        );
      })}
      {filteredProfiles.length === 0 && <Text style={styles.emptyText}>No matches for that filter yet.</Text>}
    </View>
  );

  const renderFriends = () => {
    const visibleProfiles = SAMPLE_PROFILES.filter(profile => !blockedIds.includes(profile.id));
    const friends = visibleProfiles.filter(profile => friendIds.includes(profile.id));
    const incomingRequests = visibleProfiles.filter(profile => incomingFriendIds.includes(profile.id));
    const pendingRequests = visibleProfiles.filter(profile => pendingFriendIds.includes(profile.id));

    return (
      <View style={styles.cardList}>
        {incomingRequests.length > 0 && (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Friend requests</Text>
            {incomingRequests.map(profile => (
              <View key={profile.id} style={styles.requestRow}>
                <View style={styles.profileTitleRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
                  </View>
                  <View style={styles.profileHeadingText}>
                    <Text style={styles.cardName}>{profile.name}</Text>
                    <Text style={styles.cardMajor}>{profile.major}</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.smallButton} onPress={() => handleApproveFriend(profile.id)}>
                  <Text style={styles.smallButtonText}>Approve</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {pendingRequests.length > 0 && (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>Waiting for approval</Text>
            {pendingRequests.map(profile => (
              <Text key={profile.id} style={styles.emptyText}>{profile.name} has not approved your request yet.</Text>
            ))}
          </View>
        )}

        {friends.length > 0 ? (
          friends.map(profile => (
            <View key={profile.id} style={styles.friendCard}>
              <View style={styles.profileTitleRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
                </View>
                <View style={styles.profileHeadingText}>
                  <Text style={styles.cardName}>{profile.name}</Text>
                  <Text style={styles.cardMajor}>{profile.major}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.messageButton} onPress={() => handleMessage(profile)}>
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyTitle}>No friends yet</Text>
            <Text style={styles.emptyText}>Tap + on a profile to send a friend request.</Text>
          </View>
        )}
      </View>
    );
  };

  const renderFeed = () => (
    <View style={styles.cardList}>
      <View style={styles.roomForm}>
        <Text style={styles.profileTitle}>Post to the feed</Text>
        <Text style={styles.profileSub}>Ask for help, share a study tip, or suggest something useful for classmates.</Text>
        <TextInput value={helpTopic} onChangeText={setHelpTopic} placeholder="What do you need help with?" placeholderTextColor="#666" style={styles.input} />
        <TextInput value={helpDetails} onChangeText={setHelpDetails} placeholder="Add details or a suggestion" placeholderTextColor="#666" style={[styles.input, styles.multiInput]} multiline />
        <TouchableOpacity style={styles.saveButton} onPress={handleCreateHelpPost} activeOpacity={0.85}>
          <Text style={styles.saveButtonText}>Post to feed</Text>
        </TouchableOpacity>
      </View>

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
              placeholderTextColor="#666"
              style={[styles.input, styles.commentInput]}
            />
            <TouchableOpacity style={styles.smallButton} onPress={() => handleAddComment(post.id)}>
              <Text style={styles.smallButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderStudyRooms = () => (
    <View style={styles.cardList}>
      {!!selectedRoom && (
        <View style={styles.roomDetailCard}>
          <Text style={styles.selectedSchoolLabel}>Review room</Text>
          <Text style={styles.roomDetailTitle}>{selectedRoom.name}</Text>
          <Text style={styles.cardMajor}>{selectedRoom.subject}</Text>
          <Text style={styles.cardFact}>{selectedRoom.vibe}</Text>

          <View style={styles.roomInfoGrid}>
            <View style={styles.roomInfoItem}>
              <Text style={styles.roomInfoLabel}>Location</Text>
              <Text style={styles.roomInfoValue}>{selectedRoom.floor}</Text>
            </View>
            <View style={styles.roomInfoItem}>
              <Text style={styles.roomInfoLabel}>Time</Text>
              <Text style={styles.roomInfoValue}>{selectedRoom.available}</Text>
            </View>
            <View style={styles.roomInfoItem}>
              <Text style={styles.roomInfoLabel}>Duration</Text>
              <Text style={styles.roomInfoValue}>{selectedRoom.duration}</Text>
            </View>
            <View style={styles.roomInfoItem}>
              <Text style={styles.roomInfoLabel}>Capacity</Text>
              <Text style={styles.roomInfoValue}>{selectedRoom.capacity}</Text>
            </View>
            <View style={styles.roomInfoItem}>
              <Text style={styles.roomInfoLabel}>Privacy</Text>
              <Text style={styles.roomInfoValue}>
                {selectedRoom.friendsOnly ? 'Friends only' : selectedRoom.approvalRequired ? 'Approval needed' : 'Open join'}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>People in this room</Text>
          <View style={styles.memberList}>
            {SAMPLE_PROFILES.filter(profile => selectedRoom.memberIds.includes(profile.id)).length > 0 ? (
              SAMPLE_PROFILES
                .filter(profile => selectedRoom.memberIds.includes(profile.id))
                .map(profile => (
                  <View key={profile.id} style={styles.memberRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{profile.name.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.profileHeadingText}>
                      <Text style={styles.cardName}>{profile.name}</Text>
                      <Text style={styles.cardMajor}>{profile.major}</Text>
                      <Text style={styles.cardSubtle}>{profile.year} - {profile.focus}</Text>
                    </View>
                  </View>
                ))
            ) : (
              <Text style={styles.emptyText}>No students have joined yet.</Text>
            )}
          </View>

          <TouchableOpacity style={styles.messageRoomButton} onPress={() => handleMessageRoom(selectedRoom)} activeOpacity={0.85}>
            <Text style={styles.messageRoomButtonText}>Message room</Text>
          </TouchableOpacity>
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setSelectedRoom(null)} activeOpacity={0.85}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={() => handleConfirmJoin(selectedRoom)} activeOpacity={0.85}>
              <Text style={styles.confirmButtonText}>{selectedRoom.approvalRequired ? 'Confirm request' : 'Confirm join'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={[styles.saveButton, styles.createRoomButton]} onPress={() => setShowRoomForm(current => !current)} activeOpacity={0.85}>
        <Text style={styles.saveButtonText}>{showRoomForm ? 'Close room form' : 'Create a room'}</Text>
      </TouchableOpacity>

      {showRoomForm && (
        <View style={styles.roomForm}>
          <Text style={styles.profileTitle}>Create a study room</Text>
          <Text style={styles.profileSub}>Set the basics, then choose who can find and join it.</Text>
          <TextInput value={roomName} onChangeText={setRoomName} placeholder="Room name" placeholderTextColor="#666" style={styles.input} />
          <TextInput value={roomSubject} onChangeText={setRoomSubject} placeholder="Subject or class" placeholderTextColor="#666" style={styles.input} />
          <TextInput value={roomLocation} onChangeText={setRoomLocation} placeholder="Library room or location" placeholderTextColor="#666" style={styles.input} />
          <TextInput value={roomTime} onChangeText={setRoomTime} placeholder="Meeting time" placeholderTextColor="#666" style={styles.input} />
          <TextInput value={roomDuration} onChangeText={setRoomDuration} placeholder="How long will you be there?" placeholderTextColor="#666" style={styles.input} />
          <View style={styles.twoColumn}>
            <TextInput value={roomCapacity} onChangeText={setRoomCapacity} placeholder="Capacity" placeholderTextColor="#666" style={[styles.input, styles.halfInput]} keyboardType="number-pad" />
            <TextInput value={roomVibe} onChangeText={setRoomVibe} placeholder="Vibe" placeholderTextColor="#666" style={[styles.input, styles.halfInput]} />
          </View>

          <Text style={styles.sectionLabel}>Privacy settings</Text>
          <TouchableOpacity style={[styles.privacyRow, approvalRequired && styles.privacyRowActive]} onPress={() => setApprovalRequired(current => !current)} activeOpacity={0.85}>
            <View style={[styles.toggleDot, approvalRequired && styles.toggleDotActive]} />
            <View style={styles.privacyTextWrap}>
              <Text style={styles.privacyTitle}>Require approval to join</Text>
              <Text style={styles.privacySub}>Students must request access before joining.</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.privacyRow, friendsOnly && styles.privacyRowActive]} onPress={() => setFriendsOnly(current => !current)} activeOpacity={0.85}>
            <View style={[styles.toggleDot, friendsOnly && styles.toggleDotActive]} />
            <View style={styles.privacyTextWrap}>
              <Text style={styles.privacyTitle}>Show to friends only</Text>
              <Text style={styles.privacySub}>Only students in your friend list can see it.</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={handleCreateRoom} activeOpacity={0.85}>
            <Text style={styles.saveButtonText}>Publish room</Text>
          </TouchableOpacity>
        </View>
      )}

      {studyRooms.map(room => (
        <View key={room.id} style={styles.roomCard}>
          <View>
            <Text style={styles.cardName}>{room.name}</Text>
            <Text style={styles.cardMajor}>{room.floor} - {room.capacity}</Text>
          </View>
          <Text style={styles.cardFact}>{room.subject} - {room.vibe}</Text>
          <Text style={styles.cardSubtle}>Time: {room.available} - Duration: {room.duration}</Text>
          {!!room.host && <Text style={styles.cardSubtle}>Hosted by {room.host}</Text>}
          <View style={styles.roomFooter}>
            {room.approvalRequired && <Text style={styles.tag}>Approval needed</Text>}
            {room.friendsOnly && <Text style={styles.tag}>Friends only</Text>}
            <TouchableOpacity style={styles.smallButton} onPress={() => setSelectedRoom(room)}>
              <Text style={styles.smallButtonText}>{room.approvalRequired ? 'Request' : 'Join'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderBrowse = () => (
    <>
      <View style={styles.myProfileCard}>
        <Text style={styles.selectedSchoolLabel}>Your profile</Text>
        <Text style={styles.myProfileName}>{profileHidden ? 'Profile hidden' : name}</Text>
        <Text style={styles.myProfileDetails}>
          {profileHidden ? 'Other students cannot see your profile right now.' : `${major} at ${selectedSchool}`}
        </Text>
        <TouchableOpacity
          style={styles.privacyMiniButton}
          onPress={() => setProfileHidden(current => !current)}
          activeOpacity={0.85}
        >
          <Text style={styles.privacyMiniButtonText}>{profileHidden ? 'Show profile' : 'Hide profile'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabRow}>
        {BROWSE_TABS.map(tab => (
          <TouchableOpacity key={tab} style={[styles.browseTab, activeBrowseTab === tab && styles.browseTabActive]} onPress={() => setActiveBrowseTab(tab)}>
            <Text style={[styles.browseTabText, activeBrowseTab === tab && styles.browseTabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeBrowseTab === 'Profiles' && (
        <>
          <Text style={styles.sectionLabel}>Filter profiles</Text>
          <View style={styles.choiceRow}>
            {FILTER_OPTIONS.map(option => (
              <TouchableOpacity key={option} style={[styles.choiceChip, activeFilter === option && styles.choiceChipSelected]} onPress={() => setActiveFilter(option)}>
                <Text style={[styles.choiceText, activeFilter === option && styles.choiceTextSelected]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {activeBrowseTab === 'Profiles'
        ? renderProfiles()
        : activeBrowseTab === 'Friends'
          ? renderFriends()
          : activeBrowseTab === 'Feed'
            ? renderFeed()
            : renderStudyRooms()}
    </>
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>Campus hub</Text>
            <Text style={styles.heading}>Study Groups</Text>
            <Text style={styles.description}>
              Meet classmates, find rooms, and get unstuck together.
            </Text>
          </View>
          <View style={styles.heroIcon}>
            <FontAwesome5 name="user-graduate" size={24} color="#F8FAFC" />
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{SAMPLE_PROFILES.length}</Text>
            <Text style={styles.heroStatLabel}>students</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{studyRooms.length}</Text>
            <Text style={styles.heroStatLabel}>rooms</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{helpPosts.length}</Text>
            <Text style={styles.heroStatLabel}>posts</Text>
          </View>
        </View>
      </View>

      {profileCreated ? (
        renderBrowse()
      ) : !isSearching ? (
        <TouchableOpacity style={styles.beginButton} onPress={() => setIsSearching(true)} activeOpacity={0.82}>
          <FontAwesome5 name="search-location" size={16} color="#10201C" />
          <Text style={styles.beginButtonText}>Start with your school</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Search for your university</Text>
          <TextInput
            value={schoolSearch}
            onChangeText={text => {
              setSchoolSearch(text);
              setSelectedSchool('');
            }}
            placeholder="Type your school name"
            placeholderTextColor="#666"
            style={styles.input}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {!selectedSchool && (
            <>
              <Text style={styles.sectionLabel}>Suggested schools</Text>
              <View style={styles.schoolList}>
                {filteredSchools.length > 0 ? (
                  filteredSchools.map(school => (
                    <TouchableOpacity key={school} style={styles.schoolOption} onPress={() => handleSelectSchool(school)} activeOpacity={0.8}>
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

          {!!selectedSchool && renderProfileSetup()}
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: SchoolTheme) => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: theme.background },
  container: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 36 },
  hero: {
    backgroundColor: theme.primary,
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: theme.primary,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  heroCopy: { flex: 1 },
  kicker: { color: theme.secondary, fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent, borderWidth: 1, borderColor: theme.secondary },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 18 },
  heroStat: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, paddingVertical: 10, alignItems: 'center' },
  heroStatValue: { color: theme.primary, fontSize: 18, fontWeight: '900' },
  heroStatLabel: { color: theme.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  heading: { color: '#ffffff', fontSize: 32, fontWeight: '900', marginBottom: 8 },
  description: { color: theme.onPrimary, fontSize: 15, lineHeight: 22 },
  beginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.secondary,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 16,
    shadowColor: theme.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  beginButtonText: { color: theme.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  panel: { backgroundColor: theme.surface, borderRadius: 22, borderWidth: 1, borderColor: theme.border, padding: 16 },
  panelTitle: { color: theme.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  input: {
    backgroundColor: theme.surfaceAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    color: theme.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  multiInput: { minHeight: 82, textAlignVertical: 'top' },
  twoColumn: { flexDirection: 'row', gap: 10 },
  halfInput: { flex: 1 },
  sectionLabel: {
    color: '#8C6A2F',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  schoolList: { gap: 8 },
  schoolOption: { backgroundColor: '#FFF8E8', borderRadius: 14, borderWidth: 1, borderColor: '#F1D99E', paddingHorizontal: 14, paddingVertical: 12 },
  schoolOptionText: { color: '#173E36', fontSize: 14, fontWeight: '800' },
  profileSection: { marginTop: 4 },
  selectedSchool: { backgroundColor: '#E8F7F1', borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0', padding: 12, marginBottom: 18 },
  selectedSchoolLabel: { color: '#2C7A68', fontSize: 11, fontWeight: '900', marginBottom: 3, textTransform: 'uppercase' },
  selectedSchoolText: { color: '#173E36', fontSize: 15, fontWeight: '900' },
  profileTitle: { color: '#173E36', fontSize: 20, fontWeight: '900', marginBottom: 5 },
  profileSub: { color: '#667085', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  photoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 14 },
  photoPlaceholder: { width: 62, height: 62, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8F7F1', borderWidth: 1, borderColor: '#2C7A68' },
  photoInitials: { color: '#173E36', fontSize: 28, fontWeight: '600' },
  profileImage: { width: 62, height: 62, borderRadius: 31 },
  photoTextWrap: { flex: 1, marginLeft: 12 },
  photoTitle: { color: '#173E36', fontSize: 15, fontWeight: '900', marginBottom: 3 },
  photoSub: { color: '#667085', fontSize: 13 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  choiceChip: { backgroundColor: '#FFFFFF', borderRadius: 999, borderWidth: 1, borderColor: '#D9CDBB', paddingHorizontal: 12, paddingVertical: 8 },
  choiceChipSelected: { backgroundColor: '#173E36', borderColor: '#173E36' },
  choiceText: { color: '#667085', fontSize: 13, fontWeight: '800' },
  choiceTextSelected: { color: '#ffffff' },
  saveButton: { backgroundColor: '#173E36', borderRadius: 16, marginTop: 8, paddingHorizontal: 16, paddingVertical: 14 },
  createRoomButton: { marginTop: 0 },
  saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800', textAlign: 'center' },
  myProfileCard: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#E6DDCE', padding: 16, marginBottom: 14 },
  myProfileName: { color: '#173E36', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  myProfileDetails: { color: '#667085', fontSize: 14, lineHeight: 20 },
  privacyMiniButton: { alignSelf: 'flex-start', backgroundColor: '#FFF8E8', borderRadius: 12, borderWidth: 1, borderColor: '#F1D99E', marginTop: 12, paddingHorizontal: 12, paddingVertical: 8 },
  privacyMiniButtonText: { color: '#8C6A2F', fontSize: 12, fontWeight: '900' },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E6DDCE', padding: 8, marginBottom: 16 },
  browseTab: { flexGrow: 1, flexBasis: '47%', borderRadius: 13, paddingVertical: 11, alignItems: 'center', backgroundColor: '#F8FAFC' },
  browseTabActive: { backgroundColor: '#173E36' },
  browseTabText: { color: '#667085', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  browseTabTextActive: { color: '#ffffff' },
  cardList: { gap: 12 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6DDCE', padding: 15 },
  friendCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6DDCE', padding: 15 },
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C7A68' },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  profileTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  profileHeadingText: { flex: 1 },
  profileActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { color: '#173E36', fontSize: 16, fontWeight: '900' },
  cardMeta: { color: '#8C6A2F', fontSize: 12, fontWeight: '800' },
  cardMajor: { color: '#2C7A68', fontSize: 13, fontWeight: '900', marginTop: 3 },
  cardFact: { color: '#475467', fontSize: 13, lineHeight: 19, marginTop: 12 },
  cardSubtle: { color: '#667085', fontSize: 12, lineHeight: 18, marginTop: 3 },
  iconButton: { minWidth: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#F1D99E', paddingHorizontal: 8 },
  iconButtonActive: { backgroundColor: '#E8F7F1', borderColor: '#2C7A68' },
  iconButtonText: { color: '#173E36', fontSize: 18, fontWeight: '900', lineHeight: 22 },
  messageButton: { backgroundColor: '#E8F7F1', borderRadius: 12, borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 12, paddingVertical: 8 },
  messageButtonText: { color: '#173E36', fontSize: 12, fontWeight: '900' },
  blockButton: { alignSelf: 'flex-start', marginTop: 10, paddingVertical: 4 },
  blockButtonText: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
  tag: { color: '#173E36', backgroundColor: '#E8F7F1', borderRadius: 999, borderWidth: 1, borderColor: '#A7F3D0', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 12, fontWeight: '900' },
  emptyPanel: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6DDCE', padding: 18, gap: 10 },
  emptyTitle: { color: '#173E36', fontSize: 16, fontWeight: '900', marginBottom: 2 },
  emptyText: { color: '#667085', fontSize: 14, lineHeight: 20 },
  requestRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  feedCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6DDCE', padding: 15 },
  feedKind: { alignSelf: 'flex-start', color: '#173E36', backgroundColor: '#FBCB62', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: '900', marginBottom: 8 },
  commentList: { gap: 6, marginTop: 12 },
  commentText: { color: '#475467', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 10, fontSize: 13, lineHeight: 18 },
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  commentInput: { flex: 1, marginBottom: 0 },
  roomForm: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6DDCE', padding: 15 },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 10 },
  privacyRowActive: { backgroundColor: '#E8F7F1', borderColor: '#2C7A68' },
  toggleDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#94A3B8' },
  toggleDotActive: { backgroundColor: '#2C7A68', borderColor: '#173E36' },
  privacyTextWrap: { flex: 1 },
  privacyTitle: { color: '#173E36', fontSize: 14, fontWeight: '900', marginBottom: 3 },
  privacySub: { color: '#667085', fontSize: 12, lineHeight: 17 },
  roomDetailCard: { backgroundColor: '#FFFFFF', borderRadius: 22, borderWidth: 1, borderColor: '#2C7A68', padding: 16 },
  roomDetailTitle: { color: '#173E36', fontSize: 22, fontWeight: '900', marginBottom: 4 },
  roomInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 8 },
  roomInfoItem: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 10 },
  roomInfoLabel: { color: '#8C6A2F', fontSize: 11, fontWeight: '900', marginBottom: 4, textTransform: 'uppercase' },
  roomInfoValue: { color: '#173E36', fontSize: 13, fontWeight: '800', lineHeight: 18 },
  memberList: { gap: 10, marginBottom: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', padding: 10 },
  messageRoomButton: { backgroundColor: '#E8F7F1', borderRadius: 14, borderWidth: 1, borderColor: '#A7F3D0', paddingHorizontal: 16, paddingVertical: 13, marginBottom: 10 },
  messageRoomButtonText: { color: '#173E36', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  confirmRow: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 13 },
  cancelButtonText: { color: '#475467', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  confirmButton: { flex: 1, backgroundColor: '#173E36', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13 },
  confirmButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  roomCard: { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#E6DDCE', padding: 15 },
  roomFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: '#173E36', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  smallButtonText: { color: '#ffffff', fontSize: 12, fontWeight: '900' },
});
