// components/tabs/RewardsTab.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { theme } from '../../../../constants/theme';
import { createStyles, typedTypography } from '../../../../utils/styles';

interface TabProps {
  id: string;
}

const RewardsTab: React.FC<TabProps> = ({ id }) => {
  const rewards = [
    { id: '1', title: 'First Ride Bonus', points: 100, description: 'Complete your first ride', completed: true },
    { id: '2', title: 'Weekend Warrior', points: 50, description: '3 rides on weekend', completed: false, progress: 2 },
    { id: '3', title: 'Early Bird', points: 75, description: 'Ride before 8 AM', completed: false },
    { id: '4', title: 'Share & Earn', points: 200, description: 'Refer a friend', completed: false },
  ];

  const activeOffers = [
    { id: '1', title: '20% Off', description: 'First ride this week', code: 'WEEK20', expires: '2 days' },
    { id: '2', title: 'Free Ride', description: 'On your 10th ride', code: 'TENRIDE', expires: '7 days' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rewards</Text>
      
      {/* Points Summary */}
      <View style={styles.pointsCard}>
        <View style={styles.pointsInfo}>
          <Text style={styles.pointsLabel}>Your iPoints</Text>
          <Text style={styles.pointsAmount}>325</Text>
          <Text style={styles.pointsSubtext}>Keep riding to earn more!</Text>
        </View>
        <View style={styles.pointsProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '65%' }]} />
          </View>
          <Text style={styles.nextLevel}>Next: 500 points</Text>
        </View>
      </View>

      {/* Active Offers */}
      <Text style={styles.sectionTitle}>Active Offers</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.offersScroll}>
        {activeOffers.map((offer) => (
          <View key={offer.id} style={styles.offerCard}>
            <View style={styles.offerBadge}>
              <Text style={styles.offerBadgeText}>{offer.title}</Text>
            </View>
            <Text style={styles.offerDescription}>{offer.description}</Text>
            <View style={styles.offerCode}>
              <Text style={styles.offerCodeText}>{offer.code}</Text>
              <TouchableOpacity style={styles.copyButton}>
                <Ionicons name="copy" size={16} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.offerExpiry}>Expires in {offer.expires}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Available Rewards */}
      <Text style={styles.sectionTitle}>Available Rewards</Text>
      <ScrollView style={styles.rewardsList} showsVerticalScrollIndicator={false}>
        {rewards.map((reward) => (
          <View key={reward.id} style={styles.rewardCard}>
            <View style={styles.rewardIcon}>
              <Ionicons 
                name={reward.completed ? "checkmark-circle" : "ellipse"} 
                size={24} 
                color={reward.completed ? '#10B981' : theme.colors.textSecondary} 
              />
            </View>
            <View style={styles.rewardDetails}>
              <Text style={styles.rewardTitle}>{reward.title}</Text>
              <Text style={styles.rewardDescription}>{reward.description}</Text>
              {reward.progress && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(reward.progress / 3) * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>{reward.progress}/3</Text>
                </View>
              )}
            </View>
            <View style={styles.rewardPointsContainer}>
              <Text style={styles.rewardPointsText}>+{reward.points}</Text>
              <Text style={styles.rewardPointsLabel}>points</Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  pointsCard: {
    backgroundColor: '#8B5CF6',
    padding: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  pointsInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  pointsLabel: {
    ...typedTypography.body,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: theme.spacing.xs,
  },
  pointsAmount: {
    ...typedTypography.h1,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: theme.spacing.xs,
  },
  pointsSubtext: {
    ...typedTypography.caption,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  pointsProgress: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: theme.spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  nextLevel: {
    ...typedTypography.caption,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  sectionTitle: {
    ...typedTypography.h2,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  offersScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  offerCard: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginRight: theme.spacing.md,
    width: 200,
  },
  offerBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  offerBadgeText: {
    ...typedTypography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  offerDescription: {
    ...typedTypography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  offerCode: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  offerCodeText: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  copyButton: {
    padding: theme.spacing.xs,
  },
  offerExpiry: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
  },
  rewardsList: {
    maxHeight: 200,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardDetails: {
    flex: 1,
  },
  rewardTitle: {
    ...typedTypography.body,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  rewardDescription: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  progressText: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
    minWidth: 30,
  },
  rewardPointsContainer: {
    alignItems: 'center',
  },
  rewardPointsText: {
    ...typedTypography.h2,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  rewardPointsLabel: {
    ...typedTypography.caption,
    color: theme.colors.textSecondary,
  },
});

export default RewardsTab;