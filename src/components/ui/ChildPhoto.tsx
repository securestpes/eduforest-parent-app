import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { normalizeUploadUrl } from '../../common/helpers/normalizeUploadUrl';
import { initials, avatarHue } from '../../utils/attendanceVisuals';

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
};

export function ChildPhoto({ name, uri, size = 72 }: Props) {
  const [failed, setFailed] = useState(false);
  const photoUri = normalizeUploadUrl(uri);
  const showPhoto = Boolean(photoUri) && !failed;
  const hue = avatarHue(name);
  const radius = Math.min(12, Math.max(8, Math.round(size * 0.14)));

  useEffect(() => {
    setFailed(false);
  }, [photoUri]);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
      {showPhoto ? (
        <Image
          source={{
            uri: photoUri!,
            headers: { 'ngrok-skip-browser-warning': 'true' },
          }}
          style={{ width: size, height: size, borderRadius: radius }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { backgroundColor: `hsl(${hue} 48% 46%)`, borderRadius: radius },
          ]}
        >
          <Text style={[styles.initials, { fontSize: Math.round(size * 0.32) }]}>
            {initials(name)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
