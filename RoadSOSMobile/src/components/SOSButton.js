import React, {useRef, useEffect} from 'react';
import {TouchableOpacity, Text, StyleSheet, Animated} from 'react-native';
import {colors} from '../theme/colors';

const SOSButton = ({onPress, disabled}) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {toValue: 1.08, duration: 900, useNativeDriver: true}),
        Animated.timing(pulse, {toValue: 1, duration: 900, useNativeDriver: true}),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View style={{transform: [{scale: pulse}]}}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.disabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.75}>
        <Text style={styles.label}>SOS</Text>
        <Text style={styles.sub}>TAP TO ALERT</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 24,
    borderWidth: 4,
    borderColor: '#FF6B6B',
  },
  disabled: {
    backgroundColor: '#555',
    shadowOpacity: 0,
    borderColor: '#777',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 4,
  },
  sub: {
    color: '#FFCCCC',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 4,
  },
});

export default SOSButton;
