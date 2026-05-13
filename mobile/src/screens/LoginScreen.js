import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/client";
import { styles } from "../styles";

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin@sig.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");

  async function submit() {
    try {
      setError("");
      const data = await api("/auth/login", null, { method: "POST", body: JSON.stringify({ email, password }) });
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, { flex: 1, justifyContent: "center" }]}>
        <Text style={styles.brand}>SIG</Text>
        <Text style={styles.title}>Checklist Operacional</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.label}>E-mail</Text>
        <TextInput autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
        <Text style={styles.label}>Senha</Text>
        <TextInput secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
        <TouchableOpacity onPress={submit} style={styles.button}><Text style={styles.buttonText}>Entrar</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
