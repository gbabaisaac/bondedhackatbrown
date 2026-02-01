import { Linking, StyleSheet, Text, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';

type ExternalLinkProps = {
  href: string;
  children: React.ReactNode;
  style?: any;
};

export function ExternalLink({ href, children, style }: ExternalLinkProps) {
  const handlePress = async () => {
    try {
      // Try to open with expo-web-browser first (better for mobile)
      await WebBrowser.openBrowserAsync(href);
    } catch (error) {
      // Fallback to Linking if WebBrowser fails
      const supported = await Linking.canOpenURL(href);
      if (supported) {
        await Linking.openURL(href);
      } else {
        console.error(`Cannot open URL: ${href}`);
      }
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} style={[styles.link, style]}>
      <Text style={styles.text}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: {
    // Add any default link styles here
  },
  text: {
    // Add any default text styles here
  },
});

export default ExternalLink;

