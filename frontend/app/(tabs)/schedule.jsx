// app/(tabs)/schedule.jsx  ─  InteractED Schedule (Premium Design)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView, RefreshControl,
  Switch, Platform, Animated, Dimensions,
} from 'react-native';
import { Calendar, MapPin, Plus, X, Clock, BookOpen, Bell, ChevronRight, Filter, TrendingUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiRequest } from '../../utils/api';
import * as SecureStore from 'expo-secure-store';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// ── Enhanced Event Types with Gradients ──────────────────────────────────────
const EVENT_TYPES = [
  { 
    key: 'EXAM', 
    label: 'Exam', 
    gradient: ['#FF6B6B', '#FF3B30'], 
    shadow: '#FF3B30',
    bg: '#FFF5F5',
    icon: '🎯',
    lightColor: '#FFE5E5'
  },
  { 
    key: 'DEADLINE', 
    label: 'Assignment', 
    gradient: ['#FFB039', '#FF8C00'], 
    shadow: '#FF8C00',
    bg: '#FFF9F0',
    icon: '📋',
    lightColor: '#FFF4E5'
  },
  { 
    key: 'CLASS', 
    label: 'Class', 
    gradient: ['#4A90E2', '#007AFF'], 
    shadow: '#007AFF',
    bg: '#F0F7FF',
    icon: '📚',
    lightColor: '#E5F2FF'
  },
  { 
    key: 'OTHER', 
    label: 'Event', 
    gradient: ['#9B51E0', '#7048E8'], 
    shadow: '#7048E8',
    bg: '#F8F5FF',
    icon: '✨',
    lightColor: '#F0EBFF'
  },
];

const getType = (key) => EVENT_TYPES.find(t => t.key === key) || EVENT_TYPES[3];

// ── Animated Countdown with Pulse Effect ─────────────────────────────────────
function useCountdown(targetDate) {
  const [display, setDisplay] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  
  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) { 
        setDisplay('Ended'); 
        setIsUrgent(false);
        return; 
      }
      
      const days  = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins  = Math.floor((diff % 3600000)  / 60000);
      
      setIsUrgent(diff < 3600000); // Less than 1 hour
      
      if (days > 0)  setDisplay(`${days}d ${hours}h`);
      else if (hours > 0) setDisplay(`${hours}h ${mins}m`);
      else setDisplay(`${mins}m left`);
    };
    calc();
    const id = setInterval(calc, 30000); // Update every 30s
    return () => clearInterval(id);
  }, [targetDate]);
  
  return { display, isUrgent };
}

// ── Premium Countdown Badge ──────────────────────────────────────────────────
function CountdownBadge({ date, type }) {
  const { display, isUrgent } = useCountdown(date);
  const isPast = new Date(date) < new Date();
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (isUrgent && !isPast) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [isUrgent, isPast]);

  if (isPast) {
    return (
      <View style={[cdb.badge, { backgroundColor: '#F8F9FA' }]}>
        <Clock size={11} color="#ADB5BD" strokeWidth={2.5} />
        <Text style={[cdb.txt, { color: '#ADB5BD' }]}>Past</Text>
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <LinearGradient
        colors={isUrgent ? ['#FF3B30', '#FF6B6B'] : [type.gradient[0] + '15', type.gradient[1] + '20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cdb.badge}
      >
        <Clock size={11} color={isUrgent ? '#FFF' : type.gradient[1]} strokeWidth={2.5} />
        <Text style={[cdb.txt, { color: isUrgent ? '#FFF' : type.gradient[1] }]}>{display}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const cdb = StyleSheet.create({
  badge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5, 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  txt: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
});

// ── Premium Add Event Modal ──────────────────────────────────────────────────
function AddEventModal({ visible, onClose, onAdded }) {
  const [title, setTitle]     = useState('');
  const [subject, setSubject] = useState('');
  const [type, setType]       = useState('EXAM');
  const [date, setDate]       = useState(new Date(Date.now() + 86400000));
  const [showPicker, setShowPicker] = useState(false);
  const [notify, setNotify]   = useState(true);
  const [saving, setSaving]   = useState(false);
  const slideAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const reset = () => { 
    setTitle(''); 
    setSubject(''); 
    setType('EXAM'); 
    setDate(new Date(Date.now() + 86400000)); 
    setNotify(true); 
    slideAnim.setValue(0);
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert('Missing Info', 'Please enter an event title'); return; }
    setSaving(true);
    try {
      const payload = { 
        title: title.trim(), 
        subject: subject.trim(), 
        type, 
        date: date.toISOString() 
      };
      const result = await apiRequest('/api/schedule', { 
        method: 'POST', 
        body: JSON.stringify(payload) 
      });
      onAdded(result);
      reset(); 
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save event');
    } finally { 
      setSaving(false); 
    }
  };

  const typeConfig = getType(type);

  return (
    <Modal 
      visible={visible} 
      animationType="fade" 
      transparent={true}
      statusBarTranslucent
    >
      <BlurView intensity={20} style={ae.modalOverlay}>
        <Animated.View 
          style={[
            ae.modalContent,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [600, 0],
                }),
              }],
            },
          ]}
        >
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={ae.topBar}>
              <View>
                <Text style={ae.heading}>New Event</Text>
                <Text style={ae.subHeading}>Schedule your academic activities</Text>
              </View>
              <TouchableOpacity 
                onPress={() => { reset(); onClose(); }}
                style={ae.closeBtn}
              >
                <X size={22} color="#666" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Type Selector */}
            <View style={ae.section}>
              <Text style={ae.label}>EVENT TYPE</Text>
              <View style={ae.typeGrid}>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      ae.typeCard, 
                      type === t.key && { 
                        borderWidth: 2.5, 
                        borderColor: t.gradient[1],
                        transform: [{ scale: 1.02 }]
                      }
                    ]}
                    onPress={() => setType(t.key)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={type === t.key ? t.gradient : [t.bg, t.bg]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={ae.typeCardGradient}
                    >
                      <Text style={ae.typeIcon}>{t.icon}</Text>
                      <Text style={[ae.typeLabel, { color: type === t.key ? '#fff' : '#495057' }]}>
                        {t.label}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Title Input */}
            <View style={ae.section}>
              <Text style={ae.label}>TITLE</Text>
              <View style={[ae.inputContainer, title && ae.inputContainerFocused]}>
                <TextInput 
                  style={ae.input} 
                  placeholder="e.g. Mathematics Final Exam" 
                  placeholderTextColor="#ADB5BD" 
                  value={title} 
                  onChangeText={setTitle}
                />
              </View>
            </View>

            {/* Subject Input */}
            <View style={ae.section}>
              <Text style={ae.label}>SUBJECT <Text style={ae.optional}>(optional)</Text></Text>
              <View style={[ae.inputContainer, subject && ae.inputContainerFocused]}>
                <BookOpen size={18} color="#868E96" style={{ marginRight: 10 }} />
                <TextInput 
                  style={[ae.input, { flex: 1 }]} 
                  placeholder="e.g. Mathematics" 
                  placeholderTextColor="#ADB5BD" 
                  value={subject} 
                  onChangeText={setSubject}
                />
              </View>
            </View>

            {/* Date & Time */}
            <View style={ae.section}>
              <Text style={ae.label}>DATE & TIME</Text>
              <TouchableOpacity 
                style={ae.datePicker} 
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[typeConfig.gradient[0] + '10', typeConfig.gradient[1] + '15']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={ae.datePickerGradient}
                >
                  <Calendar size={20} color={typeConfig.gradient[1]} strokeWidth={2.5} />
                  <View style={{ flex: 1 }}>
                    <Text style={ae.dateLabel}>
                      {date.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>
                    <Text style={[ae.timeLabel, { color: typeConfig.gradient[1] }]}>
                      {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={typeConfig.gradient[1]} />
                </LinearGradient>
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, d) => { 
                    setShowPicker(Platform.OS === 'ios'); 
                    if (d) setDate(d); 
                  }}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Notification Toggle */}
            <View style={ae.notifyCard}>
              <View style={ae.notifyIconWrapper}>
                <Bell size={18} color={typeConfig.gradient[1]} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ae.notifyTitle}>Reminder Notification</Text>
                <Text style={ae.notifySubtitle}>Get notified 1 hour before</Text>
              </View>
              <Switch 
                value={notify} 
                onValueChange={setNotify} 
                trackColor={{ true: typeConfig.gradient[1], false: '#E9ECEF' }}
                thumbColor="#fff"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[ae.saveBtn, saving && { opacity: 0.7 }]}
              onPress={save} 
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={typeConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={ae.saveBtnGradient}
              >
                <Text style={ae.saveTxt}>
                  {saving ? 'Creating Event...' : 'Add to Schedule'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

// ── Filter Modal Component ───────────────────────────────────────────────────
function FilterModal({ visible, onClose, selectedType, onSelect }) {
  const slideAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <TouchableOpacity 
        style={fm.overlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
          style={[
            fm.content,
            {
              transform: [{
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [400, 0],
                }),
              }],
            },
          ]}
        >
          <View style={fm.handle} />
          <Text style={fm.title}>Filter Events</Text>
          <Text style={fm.subtitle}>Choose which events to display</Text>
          
          <View style={fm.optionsGrid}>
            {['ALL', ...EVENT_TYPES.map(t => t.key)].map(key => {
              const conf = key === 'ALL' 
                ? { label: 'All Events', gradient: ['#4A90E2', '#007AFF'], icon: '📅', bg: '#F0F7FF' }
                : getType(key);
              const isSelected = selectedType === key;
              
              return (
                <TouchableOpacity
                  key={key}
                  style={[fm.option, isSelected && fm.optionSelected]}
                  onPress={() => {
                    onSelect(key);
                    setTimeout(onClose, 200);
                  }}
                  activeOpacity={0.7}
                >
                  {isSelected && (
                    <LinearGradient
                      colors={conf.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={fm.optionGradient}
                    />
                  )}
                  <View style={fm.optionContent}>
                    <Text style={fm.optionEmoji}>{conf.icon}</Text>
                    <Text style={[fm.optionLabel, isSelected && fm.optionLabelSelected]}>
                      {conf.label}
                    </Text>
                    {isSelected && (
                      <View style={fm.checkmark}>
                        <Text style={fm.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Schedule Screen ──────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const [events, setEvents] = useState([]);
  const [exams, setExams]   = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterType, setFilterType] = useState('ALL');
  const [viewMode, setViewMode] = useState('upcoming'); // 'upcoming' | 'all' | 'past'
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [schedData, examData] = await Promise.all([
        apiRequest('/api/schedule'),
        apiRequest('/api/exams'),
      ]);
      if (Array.isArray(schedData)) setEvents(schedData);
      if (Array.isArray(examData))  setExams(examData);
    } catch (_) {}
    finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Merge and sort
  const combined = useMemo(() => {
    return [
      ...exams.map(e  => ({ ...e, _kind: 'OFFICIAL', type: 'EXAM' })),
      ...events.map(e => ({ ...e, _kind: 'PERSONAL' })),
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [exams, events]);

  // Apply view mode filter (upcoming/all/past)
  const viewFiltered = useMemo(() => {
    const now = new Date();
    if (viewMode === 'upcoming') {
      return combined.filter(e => new Date(e.date) >= now);
    } else if (viewMode === 'past') {
      return combined.filter(e => new Date(e.date) < now);
    }
    return combined;
  }, [combined, viewMode]);

  // Apply type filter
  const filtered = useMemo(() => {
    return filterType === 'ALL' ? viewFiltered : viewFiltered.filter(e => e.type === filterType);
  }, [viewFiltered, filterType]);

  // Group by date
  const grouped = useMemo(() => {
    return filtered.reduce((acc, item) => {
      const key = new Date(item.date).toDateString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [filtered]);

  // Stats
  const upcomingCount = combined.filter(e => new Date(e.date) > new Date()).length;
  const todayCount = combined.filter(e => 
    new Date(e.date).toDateString() === new Date().toDateString()
  ).length;
  const pastCount = combined.filter(e => new Date(e.date) < new Date()).length;

  const currentFilterLabel = filterType === 'ALL' ? 'All Events' : getType(filterType).label;

  return (
    <View style={styles.container}>
      {/* Premium Header with Gradient */}
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FA']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Schedule</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBadge}>
                <TrendingUp size={12} color="#007AFF" strokeWidth={2.5} />
                <Text style={styles.statText}>{upcomingCount} upcoming</Text>
              </View>
              {todayCount > 0 && (
                <View style={[styles.statBadge, { backgroundColor: '#FFF5F5' }]}>
                  <Clock size={12} color="#FF3B30" strokeWidth={2.5} />
                  <Text style={[styles.statText, { color: '#FF3B30' }]}>{todayCount} today</Text>
                </View>
              )}
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.addBtn} 
            onPress={() => setAddVisible(true)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#007AFF', '#4A90E2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.addBtnGradient}
            >
              <Plus size={22} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Segmented Control for View Mode */}
        <View style={styles.controlsContainer}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[styles.segment, viewMode === 'upcoming' && styles.segmentActive]}
              onPress={() => setViewMode('upcoming')}
              activeOpacity={0.7}
            >
              {viewMode === 'upcoming' && (
                <LinearGradient
                  colors={['#007AFF', '#4A90E2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentGradient}
                />
              )}
              <Text style={[styles.segmentText, viewMode === 'upcoming' && styles.segmentTextActive]}>
                Upcoming
              </Text>
              {upcomingCount > 0 && (
                <View style={[styles.segmentBadge, viewMode === 'upcoming' && styles.segmentBadgeActive]}>
                  <Text style={[styles.segmentBadgeText, viewMode === 'upcoming' && styles.segmentBadgeTextActive]}>
                    {upcomingCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segment, viewMode === 'all' && styles.segmentActive]}
              onPress={() => setViewMode('all')}
              activeOpacity={0.7}
            >
              {viewMode === 'all' && (
                <LinearGradient
                  colors={['#007AFF', '#4A90E2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentGradient}
                />
              )}
              <Text style={[styles.segmentText, viewMode === 'all' && styles.segmentTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segment, viewMode === 'past' && styles.segmentActive]}
              onPress={() => setViewMode('past')}
              activeOpacity={0.7}
            >
              {viewMode === 'past' && (
                <LinearGradient
                  colors={['#007AFF', '#4A90E2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.segmentGradient}
                />
              )}
              <Text style={[styles.segmentText, viewMode === 'past' && styles.segmentTextActive]}>
                Past
              </Text>
              {pastCount > 0 && (
                <View style={[styles.segmentBadge, viewMode === 'past' && styles.segmentBadgeActive]}>
                  <Text style={[styles.segmentBadgeText, viewMode === 'past' && styles.segmentBadgeTextActive]}>
                    {pastCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Filter Button */}
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.filterButtonContent, filterType !== 'ALL' && styles.filterButtonActive]}>
              <Filter size={18} color={filterType !== 'ALL' ? '#007AFF' : '#868E96'} strokeWidth={2.5} />
              {filterType !== 'ALL' && (
                <View style={styles.filterDot} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Filter Indicator */}
        {filterType !== 'ALL' && (
          <View style={styles.activeFilterRow}>
            <View style={styles.activeFilterBadge}>
              <Text style={styles.activeFilterEmoji}>{getType(filterType).icon}</Text>
              <Text style={styles.activeFilterText}>{currentFilterLabel}</Text>
              <TouchableOpacity 
                onPress={() => setFilterType('ALL')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={14} color="#007AFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Events List */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor="#007AFF" 
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(grouped).length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconWrapper}>
                <Calendar size={56} color="#DEE2E6" strokeWidth={1.5} />
              </View>
              <Text style={styles.emptyTxt}>No Events Yet</Text>
              <Text style={styles.emptySubTxt}>
                Tap the + button to schedule your{'\n'}exams, assignments, and classes
              </Text>
            </View>
          )}

          {Object.entries(grouped).map(([dateStr, items], index) => {
            const d = new Date(dateStr);
            const isToday = d.toDateString() === new Date().toDateString();
            const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
            
            let dateLabel = d.toLocaleDateString('en-IN', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            });
            if (isToday) dateLabel = 'Today';
            if (isTomorrow) dateLabel = 'Tomorrow';

            return (
              <View key={dateStr} style={styles.dateGroup}>
                <View style={styles.dateLabelRow}>
                  <View style={[
                    styles.dateDot, 
                    isToday && { 
                      backgroundColor: '#007AFF',
                      width: 10,
                      height: 10,
                      shadowColor: '#007AFF',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.5,
                      shadowRadius: 4,
                    }
                  ]} />
                  <Text style={[
                    styles.dateLabel, 
                    isToday && { color: '#007AFF', fontWeight: '800' }
                  ]}>
                    {dateLabel}
                  </Text>
                  <View style={styles.dateLine} />
                </View>

                {items.map((item, idx) => {
                  const type = getType(item.type);
                  return (
                    <TouchableOpacity 
                      key={item.id}
                      style={styles.eventCard}
                      activeOpacity={0.9}
                    >
                      {/* Gradient Border */}
                      <LinearGradient
                        colors={[type.gradient[0] + '40', type.gradient[1] + '60']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.eventCardBorder}
                      />
                      
                      <View style={styles.eventCardContent}>
                        {/* Left Icon Section */}
                        <View style={[styles.eventLeft, { backgroundColor: type.lightColor }]}>
                          <Text style={styles.eventEmoji}>{type.icon}</Text>
                          <Text style={[styles.eventTime, { color: type.gradient[1] }]}>
                            {new Date(item.date).toLocaleTimeString('en-IN', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </Text>
                        </View>

                        {/* Content */}
                        <View style={styles.eventContent}>
                          <View style={styles.eventHeader}>
                            <Text style={styles.eventTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            {item._kind === 'OFFICIAL' && (
                              <View style={styles.officialBadge}>
                                <Text style={styles.officialTxt}>Official</Text>
                              </View>
                            )}
                          </View>

                          {(item.subject || item.room) && (
                            <View style={styles.eventMetaRow}>
                              {item.subject ? (
                                <>
                                  <BookOpen size={13} color="#868E96" strokeWidth={2} />
                                  <Text style={styles.eventMeta}>{item.subject}</Text>
                                </>
                              ) : (
                                <>
                                  <MapPin size={13} color="#868E96" strokeWidth={2} />
                                  <Text style={styles.eventMeta}>
                                    {item.room} · {item.time}
                                  </Text>
                                </>
                              )}
                            </View>
                          )}

                          <CountdownBadge date={item.date} type={type} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>

      <AddEventModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onAdded={(e) => { setEvents(prev => [...prev, e]); }}
      />

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        selectedType={filterType}
        onSelect={setFilterType}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAFBFC' 
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    paddingHorizontal: 24, 
    paddingBottom: 20,
  },
  headerTitle: { 
    fontSize: 36, 
    fontWeight: '800', 
    color: '#1A1A1A', 
    letterSpacing: -1.2,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  statText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
  },
  addBtn: { 
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  addBtnGradient: {
    padding: 12,
    borderRadius: 16,
  },
  controlsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  segmentedControl: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  segmentActive: {
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  segmentGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 11,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#868E96',
    letterSpacing: 0.2,
    zIndex: 1,
  },
  segmentTextActive: {
    color: '#FFF',
  },
  segmentBadge: {
    backgroundColor: '#E9ECEF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  segmentBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  segmentBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#495057',
  },
  segmentBadgeTextActive: {
    color: '#FFF',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterButtonActive: {
    backgroundColor: '#E3F2FD',
  },
  filterDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  activeFilterRow: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
    alignSelf: 'flex-start',
  },
  activeFilterEmoji: {
    fontSize: 14,
  },
  activeFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 0.2,
  },
  list: { 
    paddingHorizontal: 24, 
    paddingTop: 20,
  },
  empty: { 
    alignItems: 'center', 
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTxt: { 
    fontSize: 22, 
    fontWeight: '800', 
    color: '#495057', 
    marginBottom: 8,
  },
  emptySubTxt: { 
    fontSize: 14, 
    color: '#ADB5BD', 
    textAlign: 'center', 
    lineHeight: 20,
  },
  dateGroup: { 
    marginBottom: 32,
  },
  dateLabelRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 14,
  },
  dateDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#DEE2E6',
    marginRight: 10,
  },
  dateLabel: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#868E96', 
    textTransform: 'uppercase', 
    letterSpacing: 1,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9ECEF',
    marginLeft: 12,
  },
  eventCard: { 
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventCardBorder: {
    width: 5,
  },
  eventCardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 14,
  },
  eventLeft: { 
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 60,
  },
  eventEmoji: { 
    fontSize: 24, 
    marginBottom: 6,
  },
  eventTime: { 
    fontSize: 10, 
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  eventContent: { 
    flex: 1,
    gap: 8,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  eventTitle: { 
    flex: 1,
    fontSize: 16, 
    fontWeight: '700', 
    color: '#1A1A1A',
    lineHeight: 22,
  },
  officialBadge: { 
    backgroundColor: '#E3F2FD', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8,
  },
  officialTxt: { 
    fontSize: 9, 
    fontWeight: '800', 
    color: '#007AFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventMeta: { 
    fontSize: 13, 
    color: '#868E96',
    fontWeight: '600',
  },
});

// ── Modal Styles ──────────────────────────────────────────────────────────────
const ae = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  topBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  heading: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  subHeading: {
    fontSize: 14,
    color: '#868E96',
    marginTop: 4,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  section: {
    marginBottom: 24,
  },
  label: { 
    fontSize: 11, 
    fontWeight: '800', 
    color: '#868E96', 
    letterSpacing: 1, 
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  optional: {
    fontWeight: '600',
    color: '#ADB5BD',
  },
  typeGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  typeCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  typeCardGradient: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 6,
  },
  typeIcon: { 
    fontSize: 20,
  },
  typeLabel: { 
    fontSize: 12, 
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FAFBFC',
  },
  inputContainerFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  input: { 
    fontSize: 15, 
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  datePicker: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  datePickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 28,
  },
  notifyIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  notifySubtitle: {
    fontSize: 12,
    color: '#868E96',
    fontWeight: '500',
  },
  saveBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveTxt: { 
    color: '#FFF', 
    fontWeight: '800', 
    fontSize: 16,
    letterSpacing: 0.3,
  },
});

// ── Filter Modal Styles ───────────────────────────────────────────────────────
const fm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#868E96',
    marginBottom: 24,
    fontWeight: '500',
  },
  optionsGrid: {
    gap: 12,
  },
  option: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#007AFF',
  },
  optionGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  optionLabelSelected: {
    color: '#FFF',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});