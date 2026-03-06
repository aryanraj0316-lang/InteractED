import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Stack } from 'expo-router';

export default function AttendanceWeb() {
  return (
    <View style={styles.container}>
      {/* This adds a back button and title to the top of the web view */}
      <Stack.Screen options={{ 
        headerShown: true, 
        title: 'College Portal',
        headerBackTitle: 'Back' 
      }} />
      
      <WebView 
        source={{ uri: 'https://your-college-portal-url.com/login' }} // Replace with your college login URL
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
  loading: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white'
  }
});