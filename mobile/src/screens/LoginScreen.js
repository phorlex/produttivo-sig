import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api, getApiUrl, saveApiUrl } from "../api/client";
import { styles } from "../styles";

export function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("admin@sig.com");
  const [password, setPassword] = useState("123456");
  const [apiUrl, setApiUrl] = useState("");
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getApiUrl().then(setApiUrl).catch(() => {});
  }, []);

  async function saveApiConfig() {
    try {
      setError("");
      const nextUrl = await saveApiUrl(apiUrl);
      setApiUrl(nextUrl);
      setMessage("Endereco da API salvo.");
      setShowApiConfig(false);
    } catch (err) {
      setError("Nao foi possivel salvar o endereco da API.");
    }
  }

  async function submit() {
    try {
      setError("");
      setMessage("");
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
        {!!message && <Text style={styles.success}>{message}</Text>}
        <View style={styles.apiBar}>
          <Text style={styles.apiUrl} numberOfLines={1}>API: {apiUrl || "carregando..."}</Text>
          <TouchableOpacity onPress={() => setShowApiConfig((current) => !current)}>
            <Text style={styles.apiAction}>{showApiConfig ? "Fechar" : "Configurar API"}</Text>
          </TouchableOpacity>
        </View>
        {showApiConfig && (
          <View style={styles.card}>
            <Text style={styles.label}>Endereco da API</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder="http://192.168.0.149:4000"
              style={styles.input}
            />
            <TouchableOpacity onPress={saveApiConfig} style={styles.darkButton}>
              <Text style={styles.darkButtonText}>Salvar API</Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.label}>E-mail</Text>
        <TextInput autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input} />
        <Text style={styles.label}>Senha</Text>
        <TextInput secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />
        <TouchableOpacity onPress={submit} style={styles.button}><Text style={styles.buttonText}>Entrar</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
