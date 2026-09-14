import React from 'react';
import { Tabs } from 'expo-router';
// Ensure all icons are imported correctly
import { 
  Home, 
  Calendar, 
  MessageSquare, 
  FileText, 
  Users, 
  User, 
  MoreHorizontal 
} from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        headerShown: false,
        tabBarStyle: {
          height: 100, // Increased height slightly for 6 tabs
          paddingBottom: 20,
          paddingTop: 10,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#F2F2F7',
        },
        tabBarLabelStyle: { 
          fontSize: 10, 
          fontWeight: '600',
          marginTop: 2
        },
      }}>
      
      {/* 1. Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />

      {/* 2. Schedule */}
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
        }}
      />

      {/* 3. Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <MessageSquare size={22} color={color} />,
        }}
      />

      {/* 4. Notes */}
      <Tabs.Screen
        name="notes"
        options={{
          title: 'Notes',
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
        }}
      />

      {/* 5. Classmates */}
      <Tabs.Screen
        name="classmates"
        options={{
          title: 'Peers',
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />

      {/* 6. More / Tools */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <MoreHorizontal size={22} color={color} />,
        }}
      />

      {/* 7. Profile */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}