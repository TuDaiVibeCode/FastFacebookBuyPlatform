import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AuthRequest,
  AuthTokenResponse,
  getCurrentUser,
  loginUser,
  registerUser,
} from '@/src/lib/api';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  async function submit() {
    const trimmed = email.trim();
    const minPasswordLength = mode === 'register' ? 8 : 1;
    if (!trimmed || password.length < minPasswordLength) {
      setError(
        `Use valid email and a password with at least ${minPasswordLength} chars.`
      );
      return;
    }

    const request: AuthRequest = { email: trimmed.toLowerCase(), password };
    setLoading(true);
    setError('');
    setFeedback('');

    try {
      const response: AuthTokenResponse =
        mode === 'register' ? await registerUser(request) : await loginUser(request);
      const user = await getCurrentUser().catch(() => null);
      setFeedback(`${mode === 'register' ? 'Registered' : 'Logged in'} as ${user?.email ?? response.user.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auth request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'register' ? 'Register' : 'Login'}</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            placeholder="Password"
            placeholderTextColor="#64748B"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable style={[styles.primary, loading && styles.disabled]} onPress={submit} disabled={loading}>
            <Text style={styles.primaryText}>{loading ? 'Working...' : mode === 'register' ? 'Register' : 'Login'}</Text>
          </Pressable>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {feedback ? <Text style={styles.feedbackText}>{feedback}</Text> : null}
          <Pressable onPress={() => setMode(mode === 'register' ? 'login' : 'register')}>
            <Text style={styles.switch}>
              {mode === 'register' ? 'Already have an account? Login' : 'Need an account? Register'}
            </Text>
          </Pressable>
        </View>
        <View style={styles.tipBox}>
          <MaterialIcons name="security" size={18} color="#0B57D0" />
          <Text style={styles.tipText}>
            After auth, token is saved in local storage and sent as Authorization header.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFF',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A8C7FA',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  errorText: {
    color: '#B42318',
  },
  feedbackText: {
    color: '#157A50',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#A8C7FA',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0F172A',
    height: 44,
    paddingHorizontal: 10,
  },
  primary: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  screen: {
    backgroundColor: '#F7FAFF',
    flex: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '900',
  },
  tipBox: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderColor: '#A8C7FA',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    padding: 12,
  },
  tipText: {
    color: '#334155',
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  disabled: {
    opacity: 0.6,
  },
  switch: {
    color: '#0B57D0',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
});
