import { AppTheme } from '../theme/AppTheme';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { School } from '../data/schools';
import { colors } from '../theme/colors';

type SchoolCardProps = {
  school: School;
};

export function SchoolCard({ school }: SchoolCardProps) {
  return (
    <Pressable style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: school.accent }]}>
          <Text style={styles.badgeText}>{school.initials}</Text>
        </View>
        <MaterialIcons color={AppTheme.colors.textSecondary} name="more-vert" size={18} />
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{school.name}</Text>
        <View style={styles.addressRow}>
          <Ionicons color={AppTheme.colors.textSecondary} name="location-outline" size={12} />
          <Text style={styles.address}>{school.address}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Feather color={AppTheme.colors.primaryDark} name="columns" size={14} />
          <View>
            <Text style={styles.statLabel}>Classes</Text>
            <Text style={styles.statValue}>{school.classes}</Text>
          </View>
        </View>
        <View style={styles.statBlock}>
          <Ionicons color={AppTheme.colors.primaryDark} name="school-outline" size={14} />
          <View>
            <Text style={styles.statLabel}>Students</Text>
            <Text style={styles.statValue}>{school.students}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.medium,
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: AppTheme.radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191, 199, 212, 0.15)',
  },
  badgeText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    gap: 4,
  },
  name: {
    color: AppTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    color: AppTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  statValue: {
    color: AppTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});


