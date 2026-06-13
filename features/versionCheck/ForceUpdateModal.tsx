import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useAppLanguage } from '../../common';

interface Props {
  visible: boolean;
}

const PLAYSTORE_URL =
  'https://play.google.com/store/apps/details?id=in.co.eduforest.parent';

export const ForceUpdateModal: React.FC<Props> = ({ visible }) => {
  const { t } = useAppLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.box}>
          <Text style={styles.title}>{t('forceUpdate.title')}</Text>
          <Text style={styles.description}>{t('forceUpdate.description')}</Text>
          <TouchableOpacity style={styles.button} onPress={() => Linking.openURL(PLAYSTORE_URL)}>
            <Text style={styles.buttonText}>{t('forceUpdate.action')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  description: {
    marginBottom: 20,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
