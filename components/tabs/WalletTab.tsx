// components/tabs/WalletTab.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../constants/theme';
import { createStyles, typedTypography } from '../../utils/styles';

interface TabProps {
  id: string;
}

const WalletTab: React.FC<TabProps> = ({ id }) => {
  const recentTransactions = [
    { id: '1', type: 'ride', amount: -12.50, description: 'Trip to Eastgate', date: 'Today, 10:30 AM' },
    { id: '2', type: 'topup', amount: 50.00, description: 'Wallet Top-up', date: 'Yesterday, 3:15 PM' },
    { id: '3', type: 'ride', amount: -8.75, description: 'Trip to Work', date: 'Jan 14, 8:15 AM' },
    { id: '4', type: 'reward', amount: 5.00, description: 'Referral Bonus', date: 'Jan 12, 2:30 PM' },
    { id: '5', type: 'ride', amount: -15.20, description: 'Trip to Westgate', date: 'Jan 11, 5:45 PM' },
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ride': return 'car';
      case 'topup': return 'add-circle';
      case 'reward': return 'gift';
      default: return 'card';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'ride': return '#EF4444';
      case 'topup': return '#10B981';
      case 'reward': return '#F59E0B';
      default: return theme.colors.textSecondary;
    }
  };

  const getTransactionSign = (type: string) => {
    switch (type) {
      case 'ride': return '-';
      case 'topup': return '+';
      case 'reward': return '+';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>iWallet</Text>
      
      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceHeader}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Ionicons name="eye" size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.balanceAmount}>$45.75</Text>
        <View style={styles.balanceDetails}>
          <Text style={styles.balanceDetail}>+ $5.00 bonus available</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Add Money</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.actionIcon, { backgroundColor: '#10B98120' }]}>
            <Ionicons name="arrow-forward" size={24} color="#10B981" />
          </View>
          <Text style={styles.actionText}>Send Money</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.actionIcon, { backgroundColor: '#8B5CF620' }]}>
            <Ionicons name="card" size={24} color="#8B5CF6" />
          </View>
          <Text style={styles.actionText}>Payment Methods</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Methods */}
      <View style={styles.paymentMethods}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>
        <View style={styles.paymentCard}>
          <View style={styles.paymentInfo}>
            <Ionicons name="card" size={24} color={theme.colors.primary} />
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentType}>Ecocash</Text>
              <Text style={styles.paymentNumber}>•••• 0783 456 7890</Text>
            </View>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
        </View>
        
        <TouchableOpacity style={styles.addPaymentButton}>
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.addPaymentText}>Add Payment Method</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Recent Transactions</Text>
      <ScrollView style={styles.transactionsList} showsVerticalScrollIndicator={false}>
        {recentTransactions.map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={[styles.transactionIcon, { backgroundColor: getTransactionColor(transaction.type) + '20' }]}>
              <Ionicons 
                name={getTransactionIcon(transaction.type) as any} 
                size={20} 
                color={getTransactionColor(transaction.type)} 
              />
            </View>
            <View style={styles.transactionDetails}>
              <Text style={styles.transactionDescription}>{transaction.description}</Text>
              <Text style={styles.transactionDate}>{transaction.date}</Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: transaction.amount > 0 ? '#10B981' : '#EF4444' }
            ]}>
              {getTransactionSign(transaction.type)}${Math.abs(transaction.amount).toFixed(2)}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* View All Transactions */}
      <TouchableOpacity style={styles.viewAllButton}>
        <Text style={styles.viewAllText}>View All Transactions</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
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
  balanceCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  balanceLabel: {
    ...typedTypography.body,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  balanceAmount: {
    ...typedTypography.h1,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: theme.spacing.sm,
  },
  balanceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceDetail: {
    ...typedTypography.caption,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  actionText: {
    ...typedTypography.caption,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  paymentMethods: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...typedTypography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  paymentDetails: {
    flex: 1,
  },
  paymentType: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  paymentNumber: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  addPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  addPaymentText: {
    ...typedTypography.body,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  transactionsList: {
    maxHeight: 200,
    marginBottom: theme.spacing.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '500',
  },
  transactionDate: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  transactionAmount: {
    ...typedTypography.body,
    fontWeight: '600',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
  },
  viewAllText: {
    ...typedTypography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default WalletTab;