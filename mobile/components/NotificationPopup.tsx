import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMarkNotificationRead, useNotifications } from '../lib/queries';
import { useAuthStore } from '../lib/auth';

type NotificationItem = {
  id: string;
   type?: string;
  title?: string;
  body?: string;
  message?: string;
  read?: boolean;
};

export default function NotificationPopup() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const user = useAuthStore(s => s.user);
  const [visible, setVisible] = useState(false);
  const [notification, setNotification] =
    useState<NotificationItem | null>(null);
  const [handledIds, setHandledIds] = useState<string[]>([]);

  const notifications: NotificationItem[] = useMemo(() => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.notifications)) return data.notifications;
    return [];
  }, [data]);

  useEffect(() => {
    const unread = notifications.find(
    item =>
    item.type === 'BROADCAST' &&
    item.read !== true &&
    !handledIds.includes(item.id)
    );

    if (unread) {
      setNotification(unread);
      setVisible(true);
    }
  }, [notifications, handledIds]);

  const closePopup = async () => {
    if (!notification) return;

    const id = notification.id;

    // Prevent the same notification from opening again
    // while the server is updating its read status.
    setHandledIds(previous =>
      previous.includes(id) ? previous : [...previous, id]
    );

    setVisible(false);
    setNotification(null);

    try {
      await markRead.mutateAsync(id);
    } catch {
      // The popup is already dismissed even if marking as read fails.
    }
  };
    if (!user || (user.role !== 'USER' && user.role !== 'COACH')) {
  return null;
}
  if (!notification) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={closePopup}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.icon}>🔔</Text>

          <Text style={styles.title}>
            {notification.title || 'Notification'}
          </Text>

          <Text style={styles.message}>
            {notification.body ||
              notification.message ||
              'You have a new notification.'}
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={closePopup}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },

  icon: {
    fontSize: 34,
    marginBottom: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },

  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    textAlign: 'center',
    marginBottom: 22,
  },

  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#6C4AB6',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});