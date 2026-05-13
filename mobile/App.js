import React, { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LoginScreen } from "./src/screens/LoginScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { FillScreen } from "./src/screens/FillScreen";
import { styles } from "./src/styles";

export default function App() {
  const [token, setToken] = useState(null);
  const [active, setActive] = useState(null);
  useEffect(() => { AsyncStorage.getItem("sig_token").then(setToken); }, []);

  async function onLogin(nextToken) {
    await AsyncStorage.setItem("sig_token", nextToken);
    setToken(nextToken);
  }

  async function logout() {
    await AsyncStorage.removeItem("sig_token");
    setToken(null);
    setActive(null);
  }

  if (!token) return <LoginScreen onLogin={onLogin} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>SIG</Text>
          <Text style={styles.headerTitle}>Checklist Operacional</Text>
        </View>
        <TouchableOpacity onPress={logout}><Text style={styles.link}>Sair</Text></TouchableOpacity>
      </View>
      {active ? <FillScreen token={token} context={active} onBack={() => setActive(null)} /> : <HomeScreen token={token} onStart={setActive} />}
    </SafeAreaView>
  );
}
