// components/tabs/NotificationsTab.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../constants/theme';
import { createStyles, typedTypography } from '../../utils/styles';

interface TabProps {
  id: string;
}

const NotificationsTab: React.FC<TabProps> = ({ id }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [promotionsEnabled, setPromotionsEnabled] = useState(false);

  const notifications = [
    {
      id: '1',
      type: 'ride',
      title: 'Ride Completed',
      message: 'Your trip to Eastgate has been completed. Rate your driver!',
      time: '2 hours ago',
      read: false,
      icon: 'car',
    },
    {
      id: '2',
      type: 'promotion',
      title: 'Weekend Special',
      message: 'Get 20% off all rides this weekend. Use code: WEEKEND20',
      time: '1 day ago',
      read: true,
      icon: 'gift',
    },
    {
      id: '3',
      type: 'system',
      title: 'Wallet Updated',
      message: 'Your payment of $12.50 was processed successfully',
      time: '2 days ago',
      read: true,
      icon: 'wallet',
    },
    {
      id: '4',
      type: 'reward',
      title: 'Reward Unlocked',
      message: 'You earned 50 iPoints for completing 5 rides this week!',
      time: '3 days ago',
      read: true,
      icon: 'trophy',
    },
  ];

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'ride': return theme.colors.primary;
      case 'promotion': return '#F59E0B';
      case 'system': return '#6B7280';
      case 'reward': return '#10B981';
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>

      {/* Notification Settings */}
      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>Notification Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="notifications" size={20} color={theme.colors.text} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Ride updates and alerts</Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Ionicons name="megaphone" size={20} color={theme.colors.text} />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Promotions & Offers</Text>
              <Text style={styles.settingDescription}>Discounts and special deals</Text>
            </View>
          </View>
          <Switch
            value={promotionsEnabled}
            onValueChange={setPromotionsEnabled}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Recent Notifications */}
      <Text style={styles.sectionTitle}>Recent Notifications</Text>
      <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
        {notifications.map((notification) => (
          <TouchableOpacity key={notification.id} style={styles.notificationItem}>
            <View style={[
              styles.notificationIcon,
              { backgroundColor: getNotificationColor(notification.type) + '20' }
            ]}>
              <Ionicons 
                name={notification.icon as any} 
                size={20} 
                color={getNotificationColor(notification.type)} 
              />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
              <Text style={styles.notificationTime}>{notification.time}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Clear All Button */}
      <TouchableOpacity style={styles.clearButton}>
        <Text style={styles.clearButtonText}>Clear All Notifications</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = createStyles({
  container: {
    flex: 1,
    paddingTop: theme.spacing.md,
  },
  title: {
    ...typedTypography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  settingsCard: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  settingsTitle: {
    ...typedTypography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  settingDescription: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    ...typedTypography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  notificationsList: {
    maxHeight: 250,
    marginBottom: theme.spacing.lg,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  notificationTitle: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  notificationMessage: {
    ...typedTypography.caption,
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 16,
  },
  notificationTime: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  clearButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  clearButtonText: {
    ...typedTypography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default NotificationsTab;