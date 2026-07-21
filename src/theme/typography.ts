import { Platform, TextStyle } from 'react-native';

export const typography = {
  display: {
    fontFamily: 'Inter-ExtraBold',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.75,
  } as TextStyle,
  h1: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    letterSpacing: -0.4,
  } as TextStyle,
  h2: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.2,
  } as TextStyle,
  h3: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  } as TextStyle,
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  } as TextStyle,
  bodySmall: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
  label: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as TextStyle,
  mono: {
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  } as TextStyle,
} as const;
