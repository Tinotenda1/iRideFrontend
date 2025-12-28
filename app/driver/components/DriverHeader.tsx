// app/driver/components/DriverHeader.tsx

import { theme } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  connectDriver,
  disconnectDriver,
  DriverSocketStatus,
  getDriverSocketStatus,
} from '../socketConnectionUtility/driverSocketService';

interface DriverHeaderProps {
  onMenuPress: () => void;
  onOpenSettings: () => void;

  // Inform DriverHome / Dashboard
  setOnline?: (value: boolean) => void;
  setIsConnecting?: (value: boolean) => void;
}

export default function DriverHeader({
  onMenuPress,
  onOpenSettings,
  setOnline,
  setIsConnecting,
}: DriverHeaderProps) {
  /**
   * Local UI guard (prevents rapid toggling)
   */
  const [isToggling, setIsToggling] = useState(false);

  /**
   * Socket status mirrored from service
   */
  const [status, setStatus] =
    useState<DriverSocketStatus>('offline');

  /**
   * Polling reference (service is non-reactive)
   */
  const statusPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Start lightweight polling of socket status
   * (keeps UI & dashboard in sync)
   */
  useEffect(() => {
    statusPollRef.current = setInterval(() => {
      setStatus(getDriverSocketStatus());
    }, 500);

    return () => {
      statusPollRef.current &&
        clearInterval(statusPollRef.current);
    };
  }, []);

  /**
   * Derived states
   */
  const online = status === 'connected';
  const isConnecting =
    status === 'connecting' || status === 'reconnecting';

  /**
   * Sync socket state upward to DriverHome
   */
  useEffect(() => {
    setOnline?.(online);
    setIsConnecting?.(isConnecting);
  }, [online, isConnecting, setOnline, setIsConnecting]);

  /**
   * Handle online / offline toggle
   * Header explicitly controls socket lifecycle
   */
  const handleToggle = async (value: boolean) => {
    if (isToggling || isConnecting) return;

    console.log('[DriverHeader] Toggle:', value);
    setIsToggling(true);

    try {
      if (value) {
        console.log('[DriverHeader] Connecting driver...');
        await connectDriver();
      } else {
        console.log('[DriverHeader] Disconnecting driver...');
        disconnectDriver();
      }
    } catch (err) {
      console.error('[DriverHeader] Toggle failed:', err);
    } finally {
      setIsToggling(false);
    }
  };

  /**
   * UI helpers
   */
  const getStatusText = () => {
    if (isToggling || isConnecting) return 'Connecting...';
    return online ? 'Online' : 'Offline';
  };

  const getStatusColor = () => {
    if (isToggling || isConnecting)
      return theme.colors.warning;
    return online
      ? theme.colors.primary
      : theme.colors.textSecondary;
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        {/* Menu */}
        <TouchableOpacity
          onPress={onMenuPress}
          disabled={isToggling}
        >
          <Ionicons
            name="menu"
            size={28}
            color={
              isToggling
                ? theme.colors.textSecondary
                : theme.colors.text
            }
          />
        </TouchableOpacity>

        {/* Status + Switch */}
        <View style={styles.center}>
          {(isToggling || isConnecting) ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.warning}
            />
          ) : (
            <Switch
              value={online}
              onValueChange={handleToggle}
              thumbColor={
                online ? theme.colors.primary : '#ccc'
              }
              disabled={isToggling}
            />
          )}

          <Text
            style={[
              styles.statusText,
              { color: getStatusColor() },
            ]}
          >
            {getStatusText()}
          </Text>
        </View>

        {/* Settings */}
        <TouchableOpacity
          onPress={onOpenSettings}
          disabled={isToggling}
        >
          <Ionicons
            name="settings-outline"
            size={24}
            color={
              isToggling
                ? theme.colors.textSecondary
                : theme.colors.text
            }
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: '#fff' },
  header: {
    height: 65,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 100,
    textAlign: 'center',
  },
});
